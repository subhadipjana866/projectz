// Import express and dependencies
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from './db.js';
import { generateS3UploadUrl } from './s3.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create an instance of express
const app = express();
app.use(express.json());

// Minimal CORS support. In dev the Vite proxy serves /api from the same origin,
// but this makes the API usable directly (e.g. production on a different host).
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const PORT = process.env.PORT || 8000;
// Public origin this server is reachable at. In the single-server deployment
// this is the one domain serving both the API and the built frontend, so it
// doubles as the OAuth redirect base and the post-login redirect target.
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL || APP_URL;

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly'
];

// In-memory OAuth state store with auto-cleanup (TTL: 10 minutes)
const oauthStates = new Map();

function generateState(userId) {
  const state = crypto.randomUUID();
  oauthStates.set(state, { userId, createdAt: Date.now() });
  setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);
  return state;
}

function validateState(state) {
  const data = oauthStates.get(state);
  if (!data) return null;
  oauthStates.delete(state);
  if (Date.now() - data.createdAt > 10 * 60 * 1000) return null;
  return data.userId;
}

// Resolve the authenticated user id from a Supabase access token.
// Returns null when the token is missing or invalid.
async function getAuthUserId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${APP_URL}/api/youtube/callback`
  );
}

// Helper: check if analytics cache is stale (older than 24 hours)
function isAnalyticsStale(analyticsUpdatedAt) {
  if (!analyticsUpdatedAt) return true;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return Date.now() - new Date(analyticsUpdatedAt).getTime() > twentyFourHours;
}

// Helper: refresh access token if expired
async function refreshTokenIfNeeded(connection) {
  if (!connection.token_expires_at) return connection;

  const expiresAt = new Date(connection.token_expires_at).getTime();
  if (expiresAt > Date.now()) return connection; // Still valid

  console.log('[TOKEN_REFRESH] Token expired, refreshing for user:', connection.user_id);
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update tokens in Supabase
    const { error } = await supabaseAdmin
      .from('youtube_connections')
      .update({
        access_token: credentials.access_token,
        token_expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', connection.user_id);

    if (error) {
      console.error('[TOKEN_REFRESH] Failed to update tokens in DB:', error.message);
      throw error;
    }

    console.log('[TOKEN_REFRESH] Token refreshed successfully');
    return {
      ...connection,
      access_token: credentials.access_token,
      token_expires_at: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : connection.token_expires_at,
    };
  } catch (err) {
    console.error('[TOKEN_REFRESH] Error refreshing token:', err.message);
    throw err;
  }
}

// Helper: fetch fresh analytics from YouTube APIs
async function fetchFreshAnalytics(connection) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });

  // Fetch channel statistics
  const channelResponse = await youtube.channels.list({
    part: 'statistics,snippet',
    mine: true,
  });

  const channel = channelResponse.data.items?.[0];
  if (!channel) throw new Error('Channel not found');

  const stats = channel.statistics;
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const analyticsData = {
    views_trend: [],
    audience_age: [],
    audience_gender: { male: 0, female: 0 },
    audience_regions: [],
    traffic_sources: [],
    device_breakdown: [],
  };

  // Fetch views trend (last 30 days)
  try {
    const viewsResponse = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,subscribersGained,estimatedMinutesWatched',
      dimensions: 'day',
      sort: 'day',
    });
    console.log('[ANALYTICS] === VIEWS TREND RAW ===');
    console.log('[ANALYTICS] columnHeaders:', JSON.stringify(viewsResponse.data.columnHeaders));
    console.log('[ANALYTICS] rows count:', viewsResponse.data.rows?.length || 0);
    console.log('[ANALYTICS] first 3 rows:', JSON.stringify(viewsResponse.data.rows?.slice(0, 3)));
    if (viewsResponse.data.rows) {
      analyticsData.views_trend = viewsResponse.data.rows.map(row => ({
        date: row[0].slice(5),
        views: row[1],
        subscribers: row[2],
        watchTime: row[3],
      }));
    }
  } catch (err) {
    console.warn('[ANALYTICS] Views trend failed:', err.message);
  }

  // Fetch audience regions
  try {
    const regionResponse = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'country',
      sort: '-views',
      maxResults: 10,
    });
    console.log('[ANALYTICS] === AUDIENCE REGIONS RAW ===');
    console.log('[ANALYTICS] columnHeaders:', JSON.stringify(regionResponse.data.columnHeaders));
    console.log('[ANALYTICS] rows:', JSON.stringify(regionResponse.data.rows));
    console.log('[ANALYTICS] rows count:', regionResponse.data.rows?.length || 0);
    if (regionResponse.data.rows) {
      const totalViews = regionResponse.data.rows.reduce((sum, r) => sum + r[1], 0);
      analyticsData.audience_regions = regionResponse.data.rows.map(row => ({
        name: row[0],
        value: totalViews > 0 ? parseFloat(((row[1] / totalViews) * 100).toFixed(1)) : 0,
      }));
      console.log('[ANALYTICS] Parsed regions:', JSON.stringify(analyticsData.audience_regions));
    } else {
      console.log('[ANALYTICS] No region rows returned!');
    }
  } catch (err) {
    console.warn('[ANALYTICS] Audience region FAILED:', err.message);
    console.warn('[ANALYTICS] Region error details:', err.response?.data || err.errors || err);
  }

  // Fetch audience age
  try {
    const ageResponse = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'viewerPercentage',
      dimensions: 'ageGroup',
      sort: 'ageGroup',
    });
    console.log('[ANALYTICS] === AUDIENCE AGE RAW ===');
    console.log('[ANALYTICS] columnHeaders:', JSON.stringify(ageResponse.data.columnHeaders));
    console.log('[ANALYTICS] rows:', JSON.stringify(ageResponse.data.rows));
    console.log('[ANALYTICS] rows count:', ageResponse.data.rows?.length || 0);
    if (ageResponse.data.rows) {
      analyticsData.audience_age = ageResponse.data.rows.map(row => ({
        name: row[0].replace('age', ''),
        value: parseFloat(row[1].toFixed(1)),
      }));
      console.log('[ANALYTICS] Parsed age:', JSON.stringify(analyticsData.audience_age));
    } else {
      console.log('[ANALYTICS] No age rows returned!');
    }
  } catch (err) {
    console.warn('[ANALYTICS] Audience age FAILED:', err.message);
    console.warn('[ANALYTICS] Age error details:', err.response?.data || err.errors || err);
  }

  // Fetch audience gender
  try {
    const genderResponse = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'viewerPercentage',
      dimensions: 'gender',
    });
    console.log('[ANALYTICS] === AUDIENCE GENDER RAW ===');
    console.log('[ANALYTICS] columnHeaders:', JSON.stringify(genderResponse.data.columnHeaders));
    console.log('[ANALYTICS] rows:', JSON.stringify(genderResponse.data.rows));
    console.log('[ANALYTICS] rows count:', genderResponse.data.rows?.length || 0);
    if (genderResponse.data.rows) {
      genderResponse.data.rows.forEach(row => {
        if (row[0] === 'male') analyticsData.audience_gender.male = parseFloat(row[1].toFixed(1));
        if (row[0] === 'female') analyticsData.audience_gender.female = parseFloat(row[1].toFixed(1));
      });
      console.log('[ANALYTICS] Parsed gender:', JSON.stringify(analyticsData.audience_gender));
    } else {
      console.log('[ANALYTICS] No gender rows returned!');
    }
  } catch (err) {
    console.warn('[ANALYTICS] Audience gender FAILED:', err.message);
    console.warn('[ANALYTICS] Gender error details:', err.response?.data || err.errors || err);
  }

  // Fetch traffic sources
  try {
    const trafficResponse = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'insightTrafficSourceType',
      sort: '-views',
      maxResults: 8,
    });
    console.log('[ANALYTICS] === TRAFFIC SOURCES RAW ===');
    console.log('[ANALYTICS] rows:', JSON.stringify(trafficResponse.data.rows));
    console.log('[ANALYTICS] rows count:', trafficResponse.data.rows?.length || 0);
    if (trafficResponse.data.rows) {
      const totalViews = trafficResponse.data.rows.reduce((sum, r) => sum + r[1], 0);
      analyticsData.traffic_sources = trafficResponse.data.rows.map(row => ({
        name: row[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: totalViews > 0 ? parseFloat(((row[1] / totalViews) * 100).toFixed(1)) : 0,
      }));
      console.log('[ANALYTICS] Parsed traffic:', JSON.stringify(analyticsData.traffic_sources));
    } else {
      console.log('[ANALYTICS] No traffic rows returned!');
    }
  } catch (err) {
    console.warn('[ANALYTICS] Traffic sources FAILED:', err.message);
    console.warn('[ANALYTICS] Traffic error details:', err.response?.data || err.errors || err);
  }

  // Fetch device types
  try {
    const deviceResponse = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'deviceType',
      sort: '-views',
    });
    console.log('[ANALYTICS] === DEVICE BREAKDOWN RAW ===');
    console.log('[ANALYTICS] rows:', JSON.stringify(deviceResponse.data.rows));
    console.log('[ANALYTICS] rows count:', deviceResponse.data.rows?.length || 0);
    if (deviceResponse.data.rows) {
      const totalViews = deviceResponse.data.rows.reduce((sum, r) => sum + r[1], 0);
      analyticsData.device_breakdown = deviceResponse.data.rows.map(row => ({
        name: row[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: totalViews > 0 ? parseFloat(((row[1] / totalViews) * 100).toFixed(1)) : 0,
      }));
      console.log('[ANALYTICS] Parsed devices:', JSON.stringify(analyticsData.device_breakdown));
    } else {
      console.log('[ANALYTICS] No device rows returned!');
    }
  } catch (err) {
    console.warn('[ANALYTICS] Device breakdown FAILED:', err.message);
    console.warn('[ANALYTICS] Device error details:', err.response?.data || err.errors || err);
  }

  // === FINAL SUMMARY ===
  console.log('[ANALYTICS] ==========================================');
  console.log('[ANALYTICS] FINAL ANALYTICS SUMMARY:');
  console.log('[ANALYTICS] views_trend count:', analyticsData.views_trend.length);
  console.log('[ANALYTICS] audience_regions:', JSON.stringify(analyticsData.audience_regions));
  console.log('[ANALYTICS] audience_age:', JSON.stringify(analyticsData.audience_age));
  console.log('[ANALYTICS] audience_gender:', JSON.stringify(analyticsData.audience_gender));
  console.log('[ANALYTICS] traffic_sources:', JSON.stringify(analyticsData.traffic_sources));
  console.log('[ANALYTICS] device_breakdown:', JSON.stringify(analyticsData.device_breakdown));
  console.log('[ANALYTICS] ==========================================');

  // Update the youtube_connections row with fresh data
  const updatePayload = {
    subscriber_count: parseInt(stats.subscriberCount || 0),
    view_count: parseInt(stats.viewCount || 0),
    video_count: parseInt(stats.videoCount || 0),
    channel_title: channel.snippet.title,
    channel_thumbnail: channel.snippet.thumbnails?.default?.url || '',
    views_trend: analyticsData.views_trend,
    audience_age: analyticsData.audience_age,
    audience_gender: analyticsData.audience_gender,
    audience_regions: analyticsData.audience_regions,
    traffic_sources: analyticsData.traffic_sources,
    device_breakdown: analyticsData.device_breakdown,
    analytics_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('youtube_connections')
    .update(updatePayload)
    .eq('user_id', connection.user_id);

  if (error) {
    console.error('[ANALYTICS] Failed to cache analytics:', error.message);
  }

  return {
    channel: {
      id: connection.channel_id,
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails?.default?.url || '',
      subscriber_count: parseInt(stats.subscriberCount || 0),
      view_count: parseInt(stats.viewCount || 0),
      video_count: parseInt(stats.videoCount || 0),
    },
    analytics: analyticsData,
    analytics_updated_at: updatePayload.analytics_updated_at,
  };
}

// ─── Profile Provisioning Endpoint ──────────────────────────────────────────

// Ensure the caller has the creators/brands row that matches their role.
// Idempotent, app-level safety net that complements the DB trigger.
// Verifies the Supabase access token to derive the user id (does not trust the body).
app.post('/api/profile/me/initialize', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token' });
  }

  try {
    // Resolve the user from the token — never trust a client-supplied id here.
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const userId = userData.user.id;

    // Look up the role recorded in public.users.
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) throw profileErr;

    const role = profile?.role || null;
    const result = { role, creatorId: null, brandId: null };

    if (!role) {
      // No role chosen yet — nothing to provision.
      return res.json(result);
    }

    // Brands cover brand/agency/production; creators cover creator.
    const isBrandLike = ['brand', 'agency', 'production'].includes(role);
    const table = role === 'creator' ? 'creators' : isBrandLike ? 'brands' : null;

    if (!table) {
      return res.json(result);
    }

    // Get or create the provisioning row (exactly one per user).
    const { data: existing } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let rowId = existing?.id;
    if (!rowId) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from(table)
        .insert([{ user_id: userId }])
        .select('id')
        .single();
      if (insertErr) throw insertErr;
      rowId = inserted.id;
      console.log(`[PROFILE_INIT] Provisioned ${table} row for user:`, userId);
    }

    if (role === 'creator') result.creatorId = rowId;
    else result.brandId = rowId;

    res.json(result);
  } catch (err) {
    console.error('[PROFILE_INIT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── S3 Upload Endpoint ─────────────────────────────────────────────────────

app.post('/api/signUploadUrl', async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[S3] Received signUploadUrl request:', { userId, fileName: req.body.fileName });

  const { fileName, fileType } = req.body;
  // Scope the key to the authenticated user — never trust a client-supplied path.
  let s3_key = `uploads/${userId}/${fileName}`;
  const uploadUrl = await generateS3UploadUrl(s3_key, fileType);

  if (!uploadUrl) {
    console.error('[S3] Failed to generate presigned URL for:', s3_key);
    return res.status(500).json({ error: "Failed to generate URL" });
  }

  console.log('[S3] Generated presigned URL for:', s3_key);
  res.json({ "url": uploadUrl, "key": s3_key });
});

// ─── YouTube OAuth Endpoints ────────────────────────────────────────────────

// Get authorization URL — starts the OAuth flow
app.get('/api/youtube/auth-url', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  console.log('[YOUTUBE_AUTH] Generating auth URL for user:', userId);

  try {
    const state = generateState(userId);
    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state,
      prompt: 'consent', // Always show consent to get refresh_token
    });

    console.log('[YOUTUBE_AUTH] Generated authorization URL with state');
    res.json({ auth_url: authUrl });
  } catch (error) {
    console.error('[YOUTUBE_AUTH] Error generating auth URL:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// OAuth callback — Google redirects here after user consent
app.get('/api/youtube/callback', async (req, res) => {
  const { code, state, error } = req.query;

  console.log('[YOUTUBE_CALLBACK] Received callback');

  if (error) {
    console.error('[YOUTUBE_CALLBACK] OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}/dashboard?youtube=error`);
  }

  if (!code || !state) {
    console.error('[YOUTUBE_CALLBACK] Missing code or state');
    return res.redirect(`${FRONTEND_URL}/dashboard?youtube=error`);
  }

  const userId = validateState(state);
  if (!userId) {
    console.error('[YOUTUBE_CALLBACK] Invalid or expired state');
    return res.redirect(`${FRONTEND_URL}/dashboard?youtube=error&reason=invalid_state`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('[YOUTUBE_CALLBACK] Got tokens for user:', userId);

    // Fetch channel info
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: 'snippet,statistics',
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      console.error('[YOUTUBE_CALLBACK] No channel found');
      return res.redirect(`${FRONTEND_URL}/profile/${userId}?youtube=error&reason=no_channel`);
    }

    console.log('[YOUTUBE_CALLBACK] Channel:', channel.snippet.title);

    // UPSERT into youtube_connections
    const { error: dbError } = await supabaseAdmin
      .from('youtube_connections')
      .upsert(
        {
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          channel_id: channel.id,
          channel_title: channel.snippet.title,
          channel_description: channel.snippet.description || '',
          channel_thumbnail: channel.snippet.thumbnails?.default?.url || '',
          subscriber_count: parseInt(channel.statistics.subscriberCount || 0),
          view_count: parseInt(channel.statistics.viewCount || 0),
          video_count: parseInt(channel.statistics.videoCount || 0),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (dbError) {
      console.error('[YOUTUBE_CALLBACK] DB error:', dbError.message);
      return res.redirect(`${FRONTEND_URL}/profile/${userId}?youtube=error`);
    }

    console.log('[YOUTUBE_CALLBACK] Stored credentials in Supabase');
    res.redirect(`${FRONTEND_URL}/profile/${userId}?youtube=connected`);
  } catch (err) {
    console.error('[YOUTUBE_CALLBACK] Error:', err.message);
    res.redirect(`${FRONTEND_URL}/profile/${userId}?youtube=error`);
  }
});

// Get YouTube connection status for a user
app.get('/api/youtube/status', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  console.log('[YOUTUBE_STATUS] Checking status for user:', userId);

  try {
    const { data, error } = await supabaseAdmin
      .from('youtube_connections')
      .select('channel_id, channel_title, channel_thumbnail, subscriber_count, view_count, video_count, created_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      channel_id: data.channel_id,
      channel_title: data.channel_title,
      channel_thumbnail: data.channel_thumbnail,
      subscriber_count: data.subscriber_count,
      view_count: data.view_count,
      video_count: data.video_count,
      connected_at: data.created_at,
    });
  } catch (err) {
    console.error('[YOUTUBE_STATUS] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get YouTube analytics — uses 24h cache
app.get('/api/youtube/analytics', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  console.log('[YOUTUBE_ANALYTICS] Fetching analytics for user:', userId);

  try {
    const { data: connection, error } = await supabaseAdmin
      .from('youtube_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !connection) {
      return res.json({ connected: false });
    }

    // Check if cache is fresh (within 24 hours)
    if (!isAnalyticsStale(connection.analytics_updated_at)) {
      console.log('[YOUTUBE_ANALYTICS] Returning cached data (updated:', connection.analytics_updated_at, ')');
      return res.json({
        connected: true,
        channel: {
          id: connection.channel_id,
          title: connection.channel_title,
          thumbnail: connection.channel_thumbnail,
          subscriber_count: connection.subscriber_count,
          view_count: connection.view_count,
          video_count: connection.video_count,
        },
        analytics: {
          views_trend: connection.views_trend || [],
          audience_age: connection.audience_age || [],
          audience_gender: connection.audience_gender || { male: 0, female: 0 },
          audience_regions: connection.audience_regions || [],
          traffic_sources: connection.traffic_sources || [],
          device_breakdown: connection.device_breakdown || [],
        },
        analytics_updated_at: connection.analytics_updated_at,
        cached: true,
      });
    }

    // Cache is stale — refresh tokens if needed and fetch fresh analytics
    console.log('[YOUTUBE_ANALYTICS] Cache stale, fetching fresh data...');

    let freshConnection;
    try {
      freshConnection = await refreshTokenIfNeeded(connection);
    } catch (refreshErr) {
      console.error('[YOUTUBE_ANALYTICS] Token refresh failed:', refreshErr.message);
      // Return stale cached data if refresh fails
      return res.json({
        connected: true,
        channel: {
          id: connection.channel_id,
          title: connection.channel_title,
          thumbnail: connection.channel_thumbnail,
          subscriber_count: connection.subscriber_count,
          view_count: connection.view_count,
          video_count: connection.video_count,
        },
        analytics: {
          views_trend: connection.views_trend || [],
          audience_age: connection.audience_age || [],
          audience_gender: connection.audience_gender || { male: 0, female: 0 },
          audience_regions: connection.audience_regions || [],
          traffic_sources: connection.traffic_sources || [],
          device_breakdown: connection.device_breakdown || [],
        },
        analytics_updated_at: connection.analytics_updated_at,
        cached: true,
        token_error: true,
      });
    }

    const freshData = await fetchFreshAnalytics(freshConnection);

    res.json({
      connected: true,
      ...freshData,
      cached: false,
    });
  } catch (err) {
    console.error('[YOUTUBE_ANALYTICS] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Disconnect YouTube channel
app.delete('/api/youtube/disconnect', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  console.log('[YOUTUBE_DISCONNECT] Disconnecting for user:', userId);

  try {
    // Load tokens to attempt revocation
    const { data: connection } = await supabaseAdmin
      .from('youtube_connections')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    // Best-effort: revoke the token with Google
    if (connection?.access_token) {
      try {
        const oauth2Client = getOAuth2Client();
        await oauth2Client.revokeToken(connection.access_token);
        console.log('[YOUTUBE_DISCONNECT] Token revoked with Google');
      } catch (revokeErr) {
        console.warn('[YOUTUBE_DISCONNECT] Token revocation failed (non-critical):', revokeErr.message);
      }
    }

    // Delete from Supabase
    const { error } = await supabaseAdmin
      .from('youtube_connections')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    console.log('[YOUTUBE_DISCONNECT] Successfully disconnected');
    res.json({ message: 'Disconnected successfully' });
  } catch (err) {
    console.error('[YOUTUBE_DISCONNECT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Collaboration Request Endpoints ────────────────────────────────────────

// Send a collaboration request
app.post('/api/collaborations', async (req, res) => {
  const senderId = await getAuthUserId(req);
  if (!senderId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { receiverId, projectId, campaignId, message, budget, timeline } = req.body;

  if (!receiverId || !message) {
    return res.status(400).json({ error: 'receiverId and message are required' });
  }

  if (senderId === receiverId) {
    return res.status(400).json({ error: 'Cannot send a request to yourself' });
  }

  console.log('[COLLAB] Creating request from', senderId, 'to', receiverId);

  try {
    // Check for existing pending request
    const { data: existing } = await supabaseAdmin
      .from('collaboration_requests')
      .select('id')
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'You already have a pending request to this user' });
    }

    const insertPayload = {
      sender_id: senderId,
      receiver_id: receiverId,
      message,
      budget: budget || null,
      timeline: timeline || null,
      status: 'pending',
    };
    if (projectId) insertPayload.project_id = projectId;
    if (campaignId) insertPayload.campaign_id = campaignId;

    const { data, error } = await supabaseAdmin
      .from('collaboration_requests')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;

    console.log('[COLLAB] Request created:', data.id);
    res.status(201).json(data);
  } catch (err) {
    console.error('[COLLAB] Error creating request:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get received collaboration requests (inbox)
app.get('/api/collaborations/inbox', async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('collaboration_requests')
      .select(`
        *,
        sender:sender_id(id, display_name, avatar, role, email),
        project:project_id(id, project_name, image),
        campaign:campaign_id(id, campaign_name, image)
      `)
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('[COLLAB] Error fetching inbox:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get sent collaboration requests
app.get('/api/collaborations/sent', async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('collaboration_requests')
      .select(`
        *,
        receiver:receiver_id(id, display_name, avatar, role, email),
        project:project_id(id, project_name, image),
        campaign:campaign_id(id, campaign_name, image)
      `)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('[COLLAB] Error fetching sent:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all accepted collaborations for chat list
app.get('/api/collaborations/chats', async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('collaboration_requests')
      .select(`
        *,
        sender:sender_id(id, display_name, avatar, role),
        receiver:receiver_id(id, display_name, avatar, role),
        project:project_id(id, project_name, image),
        campaign:campaign_id(id, campaign_name, image)
      `)
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('[COLLAB] Error fetching chats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get distinct accepted-collaboration partners for a user (for "Recent Partners")
app.get('/api/collaborations/partners', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('collaboration_requests')
      .select(`
        sender:sender_id(id, display_name, avatar, role),
        receiver:receiver_id(id, display_name, avatar, role)
      `)
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Reduce to the distinct "other" party in each accepted collaboration.
    const seen = new Set();
    const partners = [];
    for (const row of data || []) {
      const other = row.sender?.id === userId ? row.receiver : row.sender;
      if (other?.id && !seen.has(other.id)) {
        seen.add(other.id);
        partners.push(other);
      }
    }

    res.json(partners);
  } catch (err) {
    console.error('[COLLAB] Error fetching partners:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Accept a collaboration request
app.patch('/api/collaborations/:id/accept', async (req, res) => {
  const { id } = req.params;
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify user is the receiver
    const { data: request } = await supabaseAdmin
      .from('collaboration_requests')
      .select('receiver_id, status')
      .eq('id', id)
      .single();

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.receiver_id !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    const { data, error } = await supabaseAdmin
      .from('collaboration_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('[COLLAB] Request accepted:', id);
    res.json(data);
  } catch (err) {
    console.error('[COLLAB] Error accepting request:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Reject a collaboration request
app.patch('/api/collaborations/:id/reject', async (req, res) => {
  const { id } = req.params;
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: request } = await supabaseAdmin
      .from('collaboration_requests')
      .select('receiver_id, status')
      .eq('id', id)
      .single();

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.receiver_id !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    const { data, error } = await supabaseAdmin
      .from('collaboration_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('[COLLAB] Request rejected:', id);
    res.json(data);
  } catch (err) {
    console.error('[COLLAB] Error rejecting request:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get chat messages for a collaboration
app.get('/api/collaborations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify user is part of this collaboration and it's accepted
    const { data: collab } = await supabaseAdmin
      .from('collaboration_requests')
      .select('sender_id, receiver_id, status')
      .eq('id', id)
      .single();

    if (!collab) return res.status(404).json({ error: 'Collaboration not found' });
    if (collab.sender_id !== userId && collab.receiver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (collab.status !== 'accepted') {
      return res.status(400).json({ error: 'Collaboration is not accepted' });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:sender_id(id, display_name, avatar)
      `)
      .eq('collaboration_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('[COLLAB] Error fetching messages:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Send a chat message
app.post('/api/collaborations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const senderId = await getAuthUserId(req);
  if (!senderId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    // Verify user is part of this collaboration and it's accepted
    const { data: collab } = await supabaseAdmin
      .from('collaboration_requests')
      .select('sender_id, receiver_id, status')
      .eq('id', id)
      .single();

    if (!collab) return res.status(404).json({ error: 'Collaboration not found' });
    if (collab.sender_id !== senderId && collab.receiver_id !== senderId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (collab.status !== 'accepted') {
      return res.status(400).json({ error: 'Collaboration is not accepted' });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert([{
        collaboration_id: id,
        sender_id: senderId,
        content,
      }])
      .select(`
        *,
        sender:sender_id(id, display_name, avatar)
      `)
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('[COLLAB] Error sending message:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve the built frontend (single-server deployment) ──────────────────
// When frontend/dist exists (i.e. `npm run build` has been run in frontend/),
// this same Express process serves the SPA too, so the whole app is one
// server on one port. Must be mounted after every /api route above.
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));

  // SPA fallback: any non-API GET request returns index.html so React Router
  // can handle the route client-side (e.g. a hard refresh on /projects/123).
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  console.log('[SERVER] frontend/dist not found — run `npm run build` in frontend/ to serve it from here.');
}

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[SERVER] Server is running on port ${PORT}`);
  console.log(`[SERVER] App URL: ${APP_URL}`);
  console.log(`[SERVER] YouTube callback URL: ${APP_URL}/api/youtube/callback`);
});