const { cosineSimilarity } = require('./ai-utils-enhanced');

/**
 * K-Means clustering implementation for documents
 */
class DocumentClusterer {
    constructor(k = 5, maxIterations = 100) {
        this.k = k;
        this.maxIterations = maxIterations;
        this.clusters = [];
        this.centroids = [];
    }

    /**
     * Perform K-Means clustering on documents
     */
    cluster(documents) {
        if (documents.length < this.k) {
            // If we have fewer documents than clusters, each document is its own cluster
            return documents.map((doc, i) => ({
                clusterId: i,
                documents: [doc],
                centroid: doc.embedding,
                label: this.generateClusterLabel([doc])
            }));
        }

        // Initialize centroids randomly
        this.centroids = this.initializeCentroids(documents);

        let iterations = 0;
        let hasChanged = true;

        while (hasChanged && iterations < this.maxIterations) {
            // Assign documents to nearest centroid
            const newClusters = this.assignToClusters(documents);

            // Check if clusters changed
            hasChanged = this.clustersChanged(newClusters);

            // Update centroids
            if (hasChanged) {
                this.centroids = this.updateCentroids(newClusters);
                this.clusters = newClusters;
            }

            iterations++;
        }

        // Generate cluster labels and metadata
        return this.clusters.map((cluster, i) => ({
            clusterId: i,
            documents: cluster,
            centroid: this.centroids[i],
            size: cluster.length,
            label: this.generateClusterLabel(cluster),
            keywords: this.extractClusterKeywords(cluster),
            avgSimilarity: this.calculateAvgSimilarity(cluster, this.centroids[i])
        }));
    }

    /**
     * Initialize centroids using k-means++ algorithm
     */
    initializeCentroids(documents) {
        const centroids = [];

        // Choose first centroid randomly
        const firstIdx = Math.floor(Math.random() * documents.length);
        centroids.push(documents[firstIdx].embedding);

        // Choose remaining centroids
        for (let i = 1; i < this.k; i++) {
            const distances = documents.map(doc => {
                // Find minimum distance to existing centroids
                const minDist = Math.min(...centroids.map(centroid =>
                    1 - cosineSimilarity(doc.embedding, centroid)
                ));
                return minDist * minDist;
            });

            // Choose next centroid with probability proportional to distance squared
            const totalDist = distances.reduce((a, b) => a + b, 0);
            let random = Math.random() * totalDist;

            for (let j = 0; j < distances.length; j++) {
                random -= distances[j];
                if (random <= 0) {
                    centroids.push(documents[j].embedding);
                    break;
                }
            }
        }

        return centroids;
    }

    /**
     * Assign documents to nearest cluster
     */
    assignToClusters(documents) {
        const clusters = Array(this.k).fill(null).map(() => []);

        documents.forEach(doc => {
            // Find nearest centroid
            let nearestCluster = 0;
            let maxSimilarity = -1;

            this.centroids.forEach((centroid, i) => {
                const similarity = cosineSimilarity(doc.embedding, centroid);
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    nearestCluster = i;
                }
            });

            clusters[nearestCluster].push(doc);
        });

        return clusters;
    }

    /**
     * Update centroids to mean of cluster members
     */
    updateCentroids(clusters) {
        return clusters.map(cluster => {
            if (cluster.length === 0) {
                // If cluster is empty, return random document embedding
                return this.centroids[Math.floor(Math.random() * this.centroids.length)];
            }

            // Calculate mean of all embeddings
            const dimensions = cluster[0].embedding.length;
            const mean = new Array(dimensions).fill(0);

            cluster.forEach(doc => {
                doc.embedding.forEach((val, i) => {
                    mean[i] += val;
                });
            });

            return mean.map(val => val / cluster.length);
        });
    }

    /**
     * Check if clusters have changed
     */
    clustersChanged(newClusters) {
        if (this.clusters.length !== newClusters.length) return true;

        for (let i = 0; i < newClusters.length; i++) {
            if (this.clusters[i]?.length !== newClusters[i].length) return true;
        }

        return false;
    }

    /**
     * Generate a descriptive label for a cluster
     */
    generateClusterLabel(documents) {
        if (documents.length === 0) return 'Empty Cluster';

        // Extract common words from document names
        const names = documents.map(doc => doc.doc_name || doc.docName || '');
        const words = names.join(' ').toLowerCase().split(/[^a-z0-9]+/);

        // Count word frequencies
        const wordFreq = {};
        words.forEach(word => {
            if (word.length > 3) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });

        // Get top 3 words
        const topWords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([word]) => word);

        if (topWords.length > 0) {
            return topWords.join(', ');
        }

        return `Cluster ${documents.length} docs`;
    }

    /**
     * Extract keywords from cluster documents
     */
    extractClusterKeywords(documents, topN = 10) {
        const allText = documents.map(doc => doc.text || '').join(' ').toLowerCase();
        const words = allText.split(/\s+/).filter(w => w.length > 3);

        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([word, freq]) => ({ word, frequency: freq }));
    }

    /**
     * Calculate average similarity within cluster
     */
    calculateAvgSimilarity(documents, centroid) {
        if (documents.length === 0) return 0;

        const similarities = documents.map(doc =>
            cosineSimilarity(doc.embedding, centroid)
        );

        return similarities.reduce((a, b) => a + b, 0) / similarities.length;
    }
}

/**
 * Hierarchical clustering using agglomerative approach
 */
function hierarchicalClustering(documents, threshold = 0.7) {
    // Start with each document as its own cluster
    let clusters = documents.map((doc, i) => ({
        id: i,
        documents: [doc],
        centroid: doc.embedding
    }));

    while (clusters.length > 1) {
        // Find most similar pair of clusters
        let maxSim = -1;
        let mergeI = 0;
        let mergeJ = 1;

        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const sim = cosineSimilarity(clusters[i].centroid, clusters[j].centroid);
                if (sim > maxSim) {
                    maxSim = sim;
                    mergeI = i;
                    mergeJ = j;
                }
            }
        }

        // Stop if similarity is below threshold
        if (maxSim < threshold) break;

        // Merge the two most similar clusters
        const merged = {
            id: clusters[mergeI].id,
            documents: [...clusters[mergeI].documents, ...clusters[mergeJ].documents],
            centroid: clusters[mergeI].centroid.map((val, idx) =>
                (val + clusters[mergeJ].centroid[idx]) / 2
            )
        };

        clusters = [
            ...clusters.slice(0, mergeI),
            ...clusters.slice(mergeI + 1, mergeJ),
            ...clusters.slice(mergeJ + 1),
            merged
        ];
    }

    return clusters.map((cluster, i) => ({
        clusterId: i,
        documents: cluster.documents,
        size: cluster.documents.length,
        centroid: cluster.centroid
    }));
}

/**
 * Find similar documents to a given document
 */
function findSimilarDocuments(targetDoc, allDocuments, topN = 5) {
    const similarities = allDocuments
        .filter(doc => doc.id !== targetDoc.id)
        .map(doc => ({
            ...doc,
            similarity: cosineSimilarity(targetDoc.embedding, doc.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topN);

    return similarities;
}

module.exports = {
    DocumentClusterer,
    hierarchicalClustering,
    findSimilarDocuments
};
