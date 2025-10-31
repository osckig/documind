/**
 * Trend Detection and Time-Series Analysis for SME Documents
 */

/**
 * Detect trends in document uploads over time
 */
function analyzeUploadTrends(documents, options = {}) {
    const { groupBy = 'day', period = 30 } = options;

    // Group documents by time period
    const grouped = groupByTimePeriod(documents, groupBy, period);

    // Calculate trend
    const trend = calculateTrend(grouped);

    // Detect patterns
    const patterns = detectPatterns(grouped);

    return {
        timeline: grouped,
        trend: trend,
        patterns: patterns,
        summary: generateTrendSummary(grouped, trend)
    };
}

/**
 * Group documents by time period
 */
function groupByTimePeriod(documents, groupBy = 'day', period = 30) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

    const groups = {};

    documents.forEach(doc => {
        const date = new Date(doc.created_at);
        if (date < cutoff) return;

        const key = getTimeKey(date, groupBy);

        if (!groups[key]) {
            groups[key] = {
                date: key,
                count: 0,
                documents: [],
                fileTypes: {},
                totalSize: 0
            };
        }

        groups[key].count++;
        groups[key].documents.push(doc);
        groups[key].totalSize += doc.file_size || 0;

        const fileType = doc.file_type || 'unknown';
        groups[key].fileTypes[fileType] = (groups[key].fileTypes[fileType] || 0) + 1;
    });

    // Convert to array and sort by date
    return Object.values(groups).sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );
}

/**
 * Get time key for grouping
 */
function getTimeKey(date, groupBy) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const week = Math.ceil(date.getDate() / 7);

    switch (groupBy) {
        case 'hour':
            const hour = String(date.getHours()).padStart(2, '0');
            return `${year}-${month}-${day} ${hour}:00`;
        case 'day':
            return `${year}-${month}-${day}`;
        case 'week':
            return `${year}-${month}-W${week}`;
        case 'month':
            return `${year}-${month}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

/**
 * Calculate overall trend (increasing, decreasing, stable)
 */
function calculateTrend(timeline) {
    if (timeline.length < 2) {
        return { direction: 'insufficient_data', slope: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = timeline.length;
    const x = timeline.map((_, i) => i);
    const y = timeline.map(t => t.count);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * i + intercept), 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    // Determine direction
    let direction = 'stable';
    if (Math.abs(slope) > 0.1) {
        direction = slope > 0 ? 'increasing' : 'decreasing';
    }

    return {
        direction,
        slope: slope,
        intercept: intercept,
        confidence: Math.max(0, Math.min(100, rSquared * 100)),
        changePercent: timeline.length > 1
            ? ((timeline[timeline.length - 1].count - timeline[0].count) / timeline[0].count * 100)
            : 0
    };
}

/**
 * Detect patterns (seasonal, weekly, etc.)
 */
function detectPatterns(timeline) {
    const patterns = [];

    // Check for weekly patterns (if we have enough data)
    if (timeline.length >= 7) {
        const weekdayPattern = analyzeWeekdayPattern(timeline);
        if (weekdayPattern.hasPattern) {
            patterns.push({
                type: 'weekly',
                description: weekdayPattern.description,
                confidence: weekdayPattern.confidence
            });
        }
    }

    // Check for spikes or drops
    const anomalies = detectAnomalies(timeline);
    if (anomalies.length > 0) {
        patterns.push({
            type: 'anomalies',
            description: `${anomalies.length} unusual activity period(s) detected`,
            anomalies: anomalies
        });
    }

    return patterns;
}

/**
 * Analyze weekday patterns
 */
function analyzeWeekdayPattern(timeline) {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    timeline.forEach(item => {
        const date = new Date(item.date);
        const day = date.getDay();
        dayTotals[day] += item.count;
        dayCounts[day]++;
    });

    const dayAverages = dayTotals.map((total, i) =>
        dayCounts[i] > 0 ? total / dayCounts[i] : 0
    );

    const maxDay = dayAverages.indexOf(Math.max(...dayAverages));
    const minDay = dayAverages.indexOf(Math.min(...dayAverages));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const variance = dayAverages.reduce((sum, avg) => {
        const mean = dayAverages.reduce((a, b) => a + b) / dayAverages.length;
        return sum + Math.pow(avg - mean, 2);
    }, 0) / dayAverages.length;

    const hasPattern = variance > 1;

    return {
        hasPattern,
        peakDay: dayNames[maxDay],
        lowDay: dayNames[minDay],
        description: hasPattern
            ? `Peak activity on ${dayNames[maxDay]}, lowest on ${dayNames[minDay]}`
            : 'No clear weekly pattern',
        confidence: hasPattern ? Math.min(100, variance * 10) : 0,
        dayAverages: dayNames.map((name, i) => ({
            day: name,
            average: dayAverages[i]
        }))
    };
}

/**
 * Detect anomalies (spikes or drops)
 */
function detectAnomalies(timeline, threshold = 2) {
    if (timeline.length < 3) return [];

    const counts = timeline.map(t => t.count);
    const mean = counts.reduce((a, b) => a + b) / counts.length;
    const stdDev = Math.sqrt(
        counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length
    );

    const anomalies = [];

    timeline.forEach((item, i) => {
        const zScore = (item.count - mean) / stdDev;

        if (Math.abs(zScore) > threshold) {
            anomalies.push({
                date: item.date,
                count: item.count,
                type: zScore > 0 ? 'spike' : 'drop',
                severity: Math.abs(zScore),
                description: zScore > 0
                    ? `Unusual spike: ${item.count} documents (${Math.round(zScore * 100)}% above normal)`
                    : `Unusual drop: ${item.count} documents (${Math.round(Math.abs(zScore) * 100)}% below normal)`
            });
        }
    });

    return anomalies;
}

/**
 * Generate human-readable summary
 */
function generateTrendSummary(timeline, trend) {
    if (timeline.length === 0) {
        return 'No data available for analysis';
    }

    const total = timeline.reduce((sum, t) => sum + t.count, 0);
    const avg = total / timeline.length;

    let summary = `Over the last ${timeline.length} periods, ${total} documents were uploaded (avg: ${Math.round(avg)} per period). `;

    if (trend.direction === 'increasing') {
        summary += `📈 Upload activity is increasing${trend.confidence > 50 ? ' significantly' : ''} (${Math.abs(Math.round(trend.changePercent))}% increase).`;
    } else if (trend.direction === 'decreasing') {
        summary += `📉 Upload activity is decreasing${trend.confidence > 50 ? ' significantly' : ''} (${Math.abs(Math.round(trend.changePercent))}% decrease).`;
    } else {
        summary += `📊 Upload activity is relatively stable.`;
    }

    return summary;
}

/**
 * Analyze content trends (topics, keywords over time)
 */
function analyzeContentTrends(documents, options = {}) {
    const { groupBy = 'week', topKeywords = 10 } = options;

    const grouped = groupByTimePeriod(documents, groupBy);

    const keywordTrends = grouped.map(group => {
        const allText = group.documents.map(doc => doc.content || '').join(' ').toLowerCase();
        const words = allText.split(/\s+/).filter(w => w.length > 4);

        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        const topWords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topKeywords)
            .map(([word, count]) => ({ word, count }));

        return {
            date: group.date,
            keywords: topWords,
            documentCount: group.count
        };
    });

    return keywordTrends;
}

/**
 * Analyze query trends from chat history
 */
function analyzeQueryTrends(queries, options = {}) {
    const { groupBy = 'day', period = 30 } = options;

    // Group queries by time
    const timeline = groupByTimePeriod(queries, groupBy, period);

    // Extract trending topics from queries
    const allQueries = queries.map(q => q.query || '').join(' ').toLowerCase();
    const words = allQueries.split(/\s+/).filter(w => w.length > 3);

    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const topTopics = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ topic: word, count }));

    return {
        timeline,
        trendingTopics: topTopics,
        totalQueries: queries.length
    };
}

module.exports = {
    analyzeUploadTrends,
    analyzeContentTrends,
    analyzeQueryTrends,
    groupByTimePeriod,
    calculateTrend,
    detectPatterns,
    detectAnomalies
};
