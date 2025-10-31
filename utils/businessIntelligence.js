/**
 * Business Intelligence utilities for SME document analysis
 * Extracts actionable insights from business documents
 */

/**
 * Detect document type based on content
 */
function detectDocumentType(text, filename) {
    const lowerText = text.toLowerCase();
    const lowerFilename = filename.toLowerCase();

    // Invoice detection
    if (lowerText.includes('invoice') || lowerText.includes('bill') ||
        lowerFilename.includes('invoice') || lowerFilename.includes('inv')) {
        return 'invoice';
    }

    // Receipt detection
    if (lowerText.includes('receipt') || lowerText.includes('paid') ||
        lowerFilename.includes('receipt') || lowerFilename.includes('rcpt')) {
        return 'receipt';
    }

    // Contract detection
    if (lowerText.includes('contract') || lowerText.includes('agreement') ||
        lowerFilename.includes('contract') || lowerFilename.includes('agreement')) {
        return 'contract';
    }

    // Report detection
    if (lowerText.includes('report') || lowerText.includes('analysis') ||
        lowerFilename.includes('report')) {
        return 'report';
    }

    // Customer feedback/complaint
    if (lowerText.includes('feedback') || lowerText.includes('complaint') ||
        lowerText.includes('issue') || lowerText.includes('problem')) {
        return 'feedback';
    }

    // Sales document
    if (lowerText.includes('sales') || lowerText.includes('order') ||
        lowerText.includes('purchase')) {
        return 'sales';
    }

    return 'general';
}

/**
 * Extract financial information from documents
 */
function extractFinancialData(documents) {
    const financialDocs = documents.filter(doc =>
        ['invoice', 'receipt', 'sales'].includes(detectDocumentType(doc.content || '', doc.original_filename || ''))
    );

    const amounts = [];
    const currencies = {};

    financialDocs.forEach(doc => {
        const text = doc.content || '';

        // Extract amounts (simple regex for common patterns)
        const amountPatterns = [
            /(?:KSH|KES|Ksh|ksh)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
            /(?:USD|usd|\$)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
            /(?:total|amount|subtotal|grand total):\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
        ];

        amountPatterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(amount) && amount > 0) {
                    amounts.push({
                        amount,
                        documentId: doc.id,
                        documentName: doc.original_filename,
                        date: doc.created_at
                    });

                    // Track currency
                    const currency = match[0].match(/[A-Z]{3}|\$/)?.[0] || 'KSH';
                    currencies[currency] = (currencies[currency] || 0) + 1;
                }
            }
        });
    });

    const totalRevenue = amounts.reduce((sum, item) => sum + item.amount, 0);
    const avgTransaction = amounts.length > 0 ? totalRevenue / amounts.length : 0;

    return {
        totalRevenue,
        avgTransaction,
        transactionCount: amounts.length,
        transactions: amounts,
        currencies,
        documentsAnalyzed: financialDocs.length
    };
}

/**
 * Analyze customer-related documents
 */
function analyzeCustomerInsights(documents) {
    const customerDocs = documents.filter(doc => {
        const type = detectDocumentType(doc.content || '', doc.original_filename || '');
        return ['feedback', 'sales', 'contract'].includes(type);
    });

    // Extract common customer issues/topics
    const allText = customerDocs.map(doc => doc.content || '').join(' ').toLowerCase();
    const words = allText.split(/\s+/).filter(w => w.length > 4);

    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const topTopics = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word, count]) => ({ topic: word, mentions: count }));

    // Detect sentiment (simple keyword-based)
    const positiveWords = ['excellent', 'great', 'good', 'satisfied', 'happy', 'love', 'best', 'perfect'];
    const negativeWords = ['bad', 'poor', 'terrible', 'hate', 'worst', 'issue', 'problem', 'complaint', 'dissatisfied'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
        positiveCount += wordFreq[word] || 0;
    });

    negativeWords.forEach(word => {
        negativeCount += wordFreq[word] || 0;
    });

    const sentimentScore = positiveCount - negativeCount;
    const sentiment = sentimentScore > 5 ? 'positive' :
                     sentimentScore < -5 ? 'negative' : 'neutral';

    return {
        totalDocuments: customerDocs.length,
        topTopics,
        sentiment,
        positiveSignals: positiveCount,
        negativeSignals: negativeCount,
        sentimentScore
    };
}

/**
 * Identify recurring issues or patterns
 */
function identifyRecurringIssues(documents) {
    const feedbackDocs = documents.filter(doc =>
        detectDocumentType(doc.content || '', doc.original_filename || '') === 'feedback'
    );

    const issues = {};

    // Common issue keywords
    const issueKeywords = [
        'delay', 'late', 'slow', 'problem', 'issue', 'error', 'wrong',
        'missing', 'broken', 'defect', 'complaint', 'dissatisfied',
        'poor', 'bad', 'terrible', 'unacceptable'
    ];

    feedbackDocs.forEach(doc => {
        const text = (doc.content || '').toLowerCase();

        issueKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                issues[keyword] = (issues[keyword] || 0) + 1;
            }
        });
    });

    const topIssues = Object.entries(issues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([issue, count]) => ({
            issue,
            occurrences: count,
            percentage: (count / feedbackDocs.length * 100).toFixed(1)
        }));

    return {
        totalFeedbackDocuments: feedbackDocs.length,
        topIssues,
        hasRecurringIssues: topIssues.length > 0 && topIssues[0].occurrences > 2
    };
}

/**
 * Generate business insights dashboard data
 */
function generateBusinessInsights(documents, chatHistory = []) {
    const documentTypes = {};
    documents.forEach(doc => {
        const type = detectDocumentType(doc.content || '', doc.original_filename || '');
        documentTypes[type] = (documentTypes[type] || 0) + 1;
    });

    const financialData = extractFinancialData(documents);
    const customerInsights = analyzeCustomerInsights(documents);
    const recurringIssues = identifyRecurringIssues(documents);

    // Calculate document growth
    const sortedDocs = [...documents].sort((a, b) =>
        new Date(a.created_at) - new Date(b.created_at)
    );

    const oldestDoc = sortedDocs[0];
    const newestDoc = sortedDocs[sortedDocs.length - 1];

    const daysSinceFirst = oldestDoc
        ? (new Date(newestDoc.created_at) - new Date(oldestDoc.created_at)) / (1000 * 60 * 60 * 24)
        : 0;

    const growthRate = daysSinceFirst > 0
        ? ((documents.length / daysSinceFirst) * 7).toFixed(1) // docs per week
        : 0;

    // Generate actionable insights
    const insights = [];

    if (financialData.totalRevenue > 0) {
        insights.push({
            type: 'financial',
            title: 'Revenue Tracking',
            message: `Total revenue tracked: KSH ${financialData.totalRevenue.toLocaleString()}`,
            value: financialData.totalRevenue,
            trend: 'info'
        });
    }

    if (recurringIssues.hasRecurringIssues) {
        const topIssue = recurringIssues.topIssues[0];
        insights.push({
            type: 'alert',
            title: 'Recurring Issue Detected',
            message: `"${topIssue.issue}" mentioned in ${topIssue.occurrences} documents (${topIssue.percentage}%)`,
            value: topIssue.occurrences,
            trend: 'warning'
        });
    }

    if (customerInsights.sentiment === 'negative') {
        insights.push({
            type: 'alert',
            title: 'Customer Sentiment',
            message: `Negative sentiment detected in customer documents`,
            value: customerInsights.sentimentScore,
            trend: 'danger'
        });
    } else if (customerInsights.sentiment === 'positive') {
        insights.push({
            type: 'success',
            title: 'Customer Sentiment',
            message: `Positive customer sentiment detected`,
            value: customerInsights.sentimentScore,
            trend: 'success'
        });
    }

    if (growthRate > 0) {
        insights.push({
            type: 'growth',
            title: 'Document Growth',
            message: `${growthRate} documents uploaded per week on average`,
            value: parseFloat(growthRate),
            trend: 'info'
        });
    }

    return {
        overview: {
            totalDocuments: documents.length,
            documentTypes,
            growthRate: parseFloat(growthRate),
            daysSinceFirst: Math.round(daysSinceFirst)
        },
        financial: financialData,
        customer: customerInsights,
        issues: recurringIssues,
        insights,
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Detect seasonal patterns in business data
 */
function detectSeasonalPatterns(documents) {
    if (documents.length < 30) {
        return {
            hasPattern: false,
            message: 'Insufficient data for seasonal analysis (minimum 30 documents required)'
        };
    }

    // Group by month
    const monthlyData = {};

    documents.forEach(doc => {
        const date = new Date(doc.created_at);
        const month = date.toLocaleString('default', { month: 'long' });

        if (!monthlyData[month]) {
            monthlyData[month] = { count: 0, documents: [] };
        }

        monthlyData[month].count++;
        monthlyData[month].documents.push(doc);
    });

    const sortedMonths = Object.entries(monthlyData)
        .sort((a, b) => b[1].count - a[1].count);

    const peakMonth = sortedMonths[0];
    const lowMonth = sortedMonths[sortedMonths.length - 1];

    return {
        hasPattern: sortedMonths.length >= 3,
        peakMonth: {
            name: peakMonth[0],
            count: peakMonth[1].count
        },
        lowMonth: {
            name: lowMonth[0],
            count: lowMonth[1].count
        },
        monthlyBreakdown: sortedMonths.map(([month, data]) => ({
            month,
            count: data.count
        }))
    };
}

module.exports = {
    detectDocumentType,
    extractFinancialData,
    analyzeCustomerInsights,
    identifyRecurringIssues,
    generateBusinessInsights,
    detectSeasonalPatterns
};
