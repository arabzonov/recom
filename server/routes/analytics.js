const express = require('express');
const { dbQuery, dbRun, dbGet } = require('../config/database');
const router = express.Router();

// Get analytics data
router.get('/', async (req, res) => {
  try {
    const { storeId, eventType, startDate, endDate, limit = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM analytics WHERE 1=1';
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (eventType) {
      sql += ' AND event_type = ?';
      params.push(eventType);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const analytics = await dbQuery(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM analytics WHERE 1=1';
    const countParams = [];

    if (storeId) {
      countSql += ' AND store_id = ?';
      countParams.push(storeId);
    }

    if (eventType) {
      countSql += ' AND event_type = ?';
      countParams.push(eventType);
    }

    if (startDate) {
      countSql += ' AND created_at >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countSql += ' AND created_at <= ?';
      countParams.push(endDate);
    }

    const countResult = await dbGet(countSql, countParams);

    res.json({
      success: true,
      data: {
        items: analytics,
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get analytics summary
router.get('/summary', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM analytics WHERE 1=1';
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    const analytics = await dbQuery(sql, params);

    // Calculate summary statistics
    const summary = {
      totalEvents: analytics.length,
      eventTypes: {},
      dailyEvents: {},
      hourlyEvents: {},
      topEvents: []
    };

    // Process events
    analytics.forEach(event => {
      const date = new Date(event.created_at);
      const day = date.toISOString().split('T')[0];
      const hour = date.getHours();

      // Event types
      summary.eventTypes[event.event_type] = (summary.eventTypes[event.event_type] || 0) + 1;

      // Daily events
      summary.dailyEvents[day] = (summary.dailyEvents[day] || 0) + 1;

      // Hourly events
      summary.hourlyEvents[hour] = (summary.hourlyEvents[hour] || 0) + 1;
    });

    // Top events
    summary.topEvents = Object.entries(summary.eventTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([eventType, count]) => ({ eventType, count }));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

// Get event type breakdown
router.get('/events/breakdown', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;

    let sql = `
      SELECT event_type, COUNT(*) as count, DATE(created_at) as date
      FROM analytics 
      WHERE 1=1
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY event_type, DATE(created_at) ORDER BY date DESC, count DESC';

    const breakdown = await dbQuery(sql, params);

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Error fetching event breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch event breakdown' });
  }
});

// Get real-time analytics
router.get('/realtime', async (req, res) => {
  try {
    const { storeId } = req.query;

    // Get events from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    let sql = `
      SELECT event_type, COUNT(*) as count, 
             MIN(created_at) as first_event, 
             MAX(created_at) as last_event
      FROM analytics 
      WHERE created_at >= ?
    `;
    const params = [oneHourAgo];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    sql += ' GROUP BY event_type ORDER BY count DESC';

    const realtimeData = await dbQuery(sql, params);

    // Get recent events (last 10)
    let recentSql = `
      SELECT event_type, event_data, created_at
      FROM analytics 
      WHERE created_at >= ?
    `;
    const recentParams = [oneHourAgo];

    if (storeId) {
      recentSql += ' AND store_id = ?';
      recentParams.push(storeId);
    }

    recentSql += ' ORDER BY created_at DESC LIMIT 10';

    const recentEvents = await dbQuery(recentSql, recentParams);

    res.json({
      success: true,
      data: {
        hourlyBreakdown: realtimeData,
        recentEvents,
        timeRange: {
          start: oneHourAgo,
          end: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({ error: 'Failed to fetch real-time analytics' });
  }
});

// Create analytics event
router.post('/', async (req, res) => {
  try {
    const { storeId, eventType, eventData, userAgent, ipAddress } = req.body;

    if (!storeId || !eventType) {
      return res.status(400).json({ error: 'Store ID and event type are required' });
    }

    const result = await dbRun(`
      INSERT INTO analytics (store_id, event_type, event_data, user_agent, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      storeId,
      eventType,
      JSON.stringify(eventData || {}),
      userAgent || req.get('User-Agent'),
      ipAddress || req.ip
    ]);

    res.json({
      success: true,
      data: {
        id: result.id,
        message: 'Analytics event created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating analytics event:', error);
    res.status(500).json({ error: 'Failed to create analytics event' });
  }
});

// Get analytics for specific date range
router.get('/range', async (req, res) => {
  try {
    const { storeId, startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    let sql = `
      SELECT 
        strftime('${dateFormat}', created_at) as period,
        event_type,
        COUNT(*) as count
      FROM analytics 
      WHERE created_at >= ? AND created_at <= ?
    `;
    const params = [startDate, endDate];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    sql += ' GROUP BY period, event_type ORDER BY period DESC, count DESC';

    const rangeData = await dbQuery(sql, params);

    res.json({
      success: true,
      data: {
        range: { startDate, endDate, groupBy },
        events: rangeData
      }
    });
  } catch (error) {
    console.error('Error fetching analytics range:', error);
    res.status(500).json({ error: 'Failed to fetch analytics range' });
  }
});

// Get top performing events
router.get('/top', async (req, res) => {
  try {
    const { storeId, limit = 10, startDate, endDate } = req.query;

    let sql = `
      SELECT event_type, COUNT(*) as count, 
             MIN(created_at) as first_seen,
             MAX(created_at) as last_seen
      FROM analytics 
      WHERE 1=1
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY event_type ORDER BY count DESC LIMIT ?';
    params.push(parseInt(limit));

    const topEvents = await dbQuery(sql, params);

    res.json({
      success: true,
      data: topEvents
    });
  } catch (error) {
    console.error('Error fetching top events:', error);
    res.status(500).json({ error: 'Failed to fetch top events' });
  }
});

module.exports = router;
