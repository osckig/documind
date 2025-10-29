// Configuration
const API_URL = 'http://localhost:3002/api';

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

// State
let currentPage = 1;
const itemsPerPage = 10;
let documents = [];

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
            loadDocumentChunks();
        }
        else if (view === 'upload') uploadView.classList.add('active');
    });
});

// File Upload Handlers
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

// Upload files to backend
async function handleFiles(files) {
    for (const file of Array.from(files)) {
        await uploadFile(file);
    }
}

async function uploadFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // Show uploading status
        showUploadingStatus(file.name);

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        // Add to UI
        addUploadedFile(data.document);
        updateStats(data.stats);

        alert(`✓ ${file.name} uploaded successfully!\n${data.document.chunksCreated} segments created.`);

    } catch (error) {
        console.error('Upload error:', error);
        alert(`✗ Failed to upload ${file.name}: ${error.message}`);
    } finally {
        removeUploadingStatus(file.name);
    }
}

function showUploadingStatus(filename) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'file-item uploading';
    statusDiv.id = `uploading-${filename}`;
    statusDiv.innerHTML = `
        <span class="file-name">
            <span class="file-icon">📤</span>
            ${filename}
        </span>
        <span class="uploading-text">Uploading...</span>
    `;
    uploadedFiles.appendChild(statusDiv);
}

function removeUploadingStatus(filename) {
    const statusDiv = document.getElementById(`uploading-${filename}`);
    if (statusDiv) statusDiv.remove();
}

function addUploadedFile(doc) {
    documents.push(doc);

    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.id = `file-${doc.id}`;
    fileItem.innerHTML = `
        <span class="file-name">
            <span class="file-icon">📄</span>
            ${doc.filename}
        </span>
        <button class="file-remove" onclick="removeDocument('${doc.id}')">Remove</button>
    `;
    uploadedFiles.appendChild(fileItem);
}

async function removeDocument(docId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        const response = await fetch(`${API_URL}/documents/${docId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Delete failed');
        }

        // Remove from UI
        const fileItem = document.getElementById(`file-${docId}`);
        if (fileItem) fileItem.remove();

        documents = documents.filter(d => d.id != docId);
        updateStats(data.stats);

        alert('✓ Document deleted successfully');

    } catch (error) {
        console.error('Delete error:', error);
        alert(`✗ Failed to delete document: ${error.message}`);
    }
}

function updateStats(stats) {
    topDocCount.textContent = stats.totalDocuments;
    topChunkCount.textContent = stats.totalChunks;
    sendButton.disabled = stats.totalDocuments === 0;
}

// Chat Functions
sendButton.addEventListener('click', () => performQuery());

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        performQuery();
    }
});

async function performQuery() {
    const query = chatInput.value.trim();

    if (!query) return;

    // Add user message
    addMessage('user', query);
    chatInput.value = '';

    // Show loading
    sendButton.disabled = true;
    sendButton.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Query failed');
        }

        // Add assistant response
        addMessage('assistant', data.answer, data.sources);

    } catch (error) {
        console.error('Query error:', error);
        addMessage('assistant', `Error: ${error.message}`);
    } finally {
        sendButton.disabled = false;
        sendButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
        `;
    }
}

function addMessage(role, content, sources = []) {
    // Remove intro card if exists
    const introCard = chatContainer.querySelector('.intro-card');
    if (introCard) introCard.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    let sourcesHTML = '';
    if (sources && sources.length > 0) {
        const sourceId = 'sources-' + Date.now();
        sourcesHTML = `
            <div class="sources">
                <button class="sources-toggle" onclick="toggleSources('${sourceId}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    View ${sources.length} Source${sources.length > 1 ? 's' : ''}
                </button>
                <div class="sources-content" id="${sourceId}" style="display: none;">
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

// Toggle sources visibility
function toggleSources(id) {
    const sourcesContent = document.getElementById(id);
    const button = sourcesContent.previousElementSibling;
    const svg = button.querySelector('svg');

    if (sourcesContent.style.display === 'none') {
        sourcesContent.style.display = 'block';
        svg.style.transform = 'rotate(180deg)';
        button.innerHTML = button.innerHTML.replace('View', 'Hide');
    } else {
        sourcesContent.style.display = 'none';
        svg.style.transform = 'rotate(0deg)';
        button.innerHTML = button.innerHTML.replace('Hide', 'View');
    }
}

// Document Chunks with Pagination
async function loadDocumentChunks() {
    try {
        const response = await fetch(`${API_URL}/chunks?page=${currentPage}&limit=${itemsPerPage}`);
        const data = await response.json();

        renderDocumentCards(data.chunks, data.pagination);

    } catch (error) {
        console.error('Load chunks error:', error);
        documentCards.innerHTML = '<div class="intro-card"><p>Error loading documents</p></div>';
    }
}

function renderDocumentCards(chunks, paginationData) {
    if (!chunks || chunks.length === 0) {
        documentCards.innerHTML = '<div class="intro-card"><p>No documents uploaded yet</p></div>';
        pagination.style.display = 'none';
        return;
    }

    documentCards.innerHTML = chunks.map(chunk => `
        <div class="card">
            <div class="card-meta">Document Segment</div>
            <div class="card-title">${chunk.docName}</div>
            <div class="card-preview">${chunk.text.substring(0, 200)}${chunk.text.length > 200 ? '...' : ''}</div>
        </div>
    `).join('');

    pageInfo.textContent = `${paginationData.page} / ${paginationData.totalPages}`;
    prevPageBtn.disabled = paginationData.page === 1;
    nextPageBtn.disabled = paginationData.page === paginationData.totalPages;
    pagination.style.display = 'flex';
}

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadDocumentChunks();
    }
});

nextPageBtn.addEventListener('click', () => {
    currentPage++;
    loadDocumentChunks();
});

// Initialize - Load existing documents
async function initialize() {
    try {
        // Check backend health
        const healthResponse = await fetch(`${API_URL}/health`);
        if (!healthResponse.ok) {
            throw new Error('Backend not available');
        }

        // Load existing documents
        const docsResponse = await fetch(`${API_URL}/documents`);
        const docsData = await docsResponse.json();

        documents = docsData.documents || [];
        updateStats(docsData.stats);

        // Display uploaded files
        documents.forEach(doc => addUploadedFile(doc));

        console.log('✓ Connected to DocuMind backend');

    } catch (error) {
        console.error('Initialization error:', error);
        console.warn('⚠ Backend not available. Please start the server with: npm start');
        alert('⚠ Backend server is not running.\n\nPlease run: npm install && npm start');
    }
}

// Start
initialize();
