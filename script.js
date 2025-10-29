// DOM Elements
const chatView = document.getElementById('chatView');
const dataView = document.getElementById('dataView');
const uploadView = document.getElementById('uploadView');
const tabButtons = document.querySelectorAll('.tab-btn');

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadedFiles = document.getElementById('uploadedFiles');
const documentCards = document.getElementById('documentCards');
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');

const topDocCount = document.getElementById('topDocCount');
const topChunkCount = document.getElementById('topChunkCount');

const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const pagination = document.getElementById('pagination');

// Storage
let documents = [];
let documentChunks = [];
let chatHistory = [];
let currentPage = 1;
const itemsPerPage = 10;

// Navigation
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;

        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        [chatView, dataView, uploadView].forEach(v => v.classList.remove('active'));

        if (view === 'chat') chatView.classList.add('active');
        else if (view === 'data') {
            dataView.classList.add('active');
            renderDocumentCards();
        }
        else if (view === 'upload') uploadView.classList.add('active');
    });
});

// File Upload
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

async function handleFiles(files) {
    for (const file of Array.from(files)) {
        try {
            let content = '';

            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                content = await extractPDFText(file);
            } else {
                content = await readTextFile(file);
            }

            if (content.trim()) {
                addDocument(file.name, content);
            } else {
                alert(`Could not extract text from ${file.name}`);
            }
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            alert(`Error processing ${file.name}: ${error.message}`);
        }
    }
}

function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

async function extractPDFText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const typedArray = new Uint8Array(e.target.result);
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let fullText = '';

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }

                resolve(fullText);
            } catch (error) {
                reject(new Error('Failed to parse PDF: ' + error.message));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.readAsArrayBuffer(file);
    });
}

function addDocument(filename, content) {
    if (documents.some(doc => doc.filename === filename)) {
        alert(`${filename} is already uploaded`);
        return;
    }

    const doc = {
        id: Date.now() + Math.random(),
        filename: filename,
        content: content,
        uploadedAt: new Date()
    };

    documents.push(doc);
    const chunks = createChunks(doc);
    documentChunks.push(...chunks);

    updateUI();
    displayUploadedFile(doc);
}

function createChunks(doc, chunkSize = 500) {
    const chunks = [];
    const text = doc.content;
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';

    sentences.forEach(sentence => {
        if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push({
                docId: doc.id,
                docName: doc.filename,
                text: currentChunk.trim()
            });
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    });

    if (currentChunk.trim().length > 0) {
        chunks.push({
            docId: doc.id,
            docName: doc.filename,
            text: currentChunk.trim()
        });
    }

    return chunks;
}

function displayUploadedFile(doc) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <span class="file-name">
            <span class="file-icon">📄</span>
            ${doc.filename}
        </span>
        <button class="file-remove" onclick="removeDocument('${doc.id}')">Remove</button>
    `;
    uploadedFiles.appendChild(fileItem);
}

function removeDocument(docId) {
    documents = documents.filter(doc => doc.id != docId);
    documentChunks = documentChunks.filter(chunk => chunk.docId != docId);

    uploadedFiles.innerHTML = '';
    documents.forEach(doc => displayUploadedFile(doc));

    updateUI();
}

function updateUI() {
    topDocCount.textContent = documents.length;
    topChunkCount.textContent = documentChunks.length;
    sendButton.disabled = documents.length === 0;
}

// Text Processing
function preprocessText(text) {
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
        'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which',
        'who', 'when', 'where', 'why', 'how', 'there'
    ]);

    return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
}

function calculateSimilarity(query, text) {
    const queryWords = preprocessText(query);
    const textWords = preprocessText(text);

    if (queryWords.length === 0 || textWords.length === 0) {
        return 0;
    }

    const textWordCount = {};
    textWords.forEach(word => {
        textWordCount[word] = (textWordCount[word] || 0) + 1;
    });

    let matchCount = 0;
    let weightedScore = 0;

    queryWords.forEach(qWord => {
        if (textWordCount[qWord]) {
            matchCount++;
            weightedScore += Math.log(1 + textWordCount[qWord]);
        }

        textWords.forEach(tWord => {
            if (tWord.includes(qWord) || qWord.includes(tWord)) {
                if (tWord !== qWord) {
                    weightedScore += 0.5;
                }
            }
        });
    });

    const coverageScore = matchCount / queryWords.length;
    const frequencyScore = weightedScore / (queryWords.length * 2);

    return (coverageScore * 0.6 + frequencyScore * 0.4);
}

// Chat Functions
sendButton.addEventListener('click', () => performSearch());

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        performSearch();
    }
});

function performSearch() {
    const query = chatInput.value.trim();

    if (!query) return;

    if (documents.length === 0) {
        alert('Please upload documents first');
        return;
    }

    // Add user message
    addMessage('user', query);
    chatInput.value = '';

    // Show loading
    sendButton.disabled = true;
    sendButton.innerHTML = '<div class="loading-spinner"></div>';

    setTimeout(() => {
        const results = searchDocuments(query);
        const answer = generateAnswer(results);

        addMessage('assistant', answer, results);

        sendButton.disabled = false;
        sendButton.innerHTML = '<span>➤</span>';
    }, 1000);
}

function searchDocuments(query) {
    const scoredChunks = documentChunks.map(chunk => ({
        ...chunk,
        score: calculateSimilarity(query, chunk.text)
    }));

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, 5).filter(chunk => chunk.score > 0);
}

function generateAnswer(results) {
    if (results.length === 0 || results[0].score < 0.05) {
        return `I couldn't find relevant information to answer your question. Please try rephrasing or upload more relevant documents.`;
    }

    const topResults = results.slice(0, 2);
    let answerText = topResults.map(r => r.text).join('\n\n');

    return answerText;
}

function addMessage(role, content, sources = []) {
    // Remove intro card if exists
    const introCard = chatContainer.querySelector('.intro-card');
    if (introCard) introCard.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    let sourcesHTML = '';
    if (sources.length > 0) {
        sourcesHTML = `
            <div class="sources">
                <div class="sources-title">Relevant Sources</div>
                ${sources.map(source => `
                    <div class="source-item">
                        <div class="source-header">
                            <span class="source-doc">${source.docName}</span>
                            <span class="source-score">Relevance: ${(source.score * 100).toFixed(1)}%</span>
                        </div>
                        <div class="source-text">${source.text.substring(0, 150)}...</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-role ${role}">${role === 'user' ? 'You' : 'Assistant'}</span>
        </div>
        <div class="message-content">
            <p>${content}</p>
            ${sourcesHTML}
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Document Cards with Pagination
function renderDocumentCards() {
    if (documentChunks.length === 0) {
        documentCards.innerHTML = '<div class="intro-card"><p>No documents uploaded yet</p></div>';
        pagination.style.display = 'none';
        return;
    }

    const totalPages = Math.ceil(documentChunks.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageChunks = documentChunks.slice(startIdx, endIdx);

    documentCards.innerHTML = pageChunks.map(chunk => `
        <div class="card">
            <div class="card-meta">Document</div>
            <div class="card-title">${chunk.docName}</div>
            <div class="card-preview">${chunk.text.substring(0, 200)}${chunk.text.length > 200 ? '...' : ''}</div>
        </div>
    `).join('');

    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    pagination.style.display = 'flex';
}

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderDocumentCards();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(documentChunks.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderDocumentCards();
    }
});

// Initialize
updateUI();
