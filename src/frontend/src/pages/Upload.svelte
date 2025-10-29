<script>
  import { onMount } from 'svelte';
  import { documents } from '../services/api.js';

  let files = [];
  let uploading = false;
  let uploadProgress = 0;
  let documents_list = [];
  let error = null;
  let success = null;

  onMount(async () => {
    await loadDocuments();
  });

  async function loadDocuments() {
    try {
      const result = await documents.list();
      documents_list = result.documents;
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }

  function handleFileSelect(event) {
    files = Array.from(event.target.files);
  }

  async function uploadFiles() {
    if (files.length === 0) return;

    uploading = true;
    error = null;
    success = null;

    for (const file of files) {
      try {
        await documents.upload(file, (progress) => {
          uploadProgress = progress;
        });
      } catch (err) {
        error = err.response?.data?.detail || 'Upload failed';
        console.error('Upload error:', err);
        uploading = false;
        return;
      }
    }

    success = `Successfully uploaded ${files.length} file(s)`;
    files = [];
    uploadProgress = 0;
    uploading = false;

    // Reload documents list
    await loadDocuments();

    // Clear success message after 3 seconds
    setTimeout(() => {
      success = null;
    }, 3000);
  }

  async function deleteDocument(id) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documents.delete(id);
      await loadDocuments();
    } catch (err) {
      error = err.response?.data?.detail || 'Delete failed';
      console.error('Delete error:', err);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
</script>

<div class="max-w-7xl mx-auto">
  <div class="mb-6">
    <h2 class="text-3xl font-bold text-gray-900 mb-2">Upload Documents</h2>
    <p class="text-gray-600">
      Upload PDFs, DOCX, TXT files, or images for text extraction
    </p>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
      {error}
    </div>
  {/if}

  {#if success}
    <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
      {success}
    </div>
  {/if}

  <!-- Upload Area -->
  <div class="card mb-8">
    <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <input
        type="file"
        id="fileInput"
        multiple
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
        on:change={handleFileSelect}
        class="hidden"
      />

      {#if files.length === 0}
        <label for="fileInput" class="cursor-pointer">
          <div class="text-6xl mb-4">📁</div>
          <p class="text-lg font-medium text-gray-700 mb-2">
            Click to select files or drag and drop
          </p>
          <p class="text-sm text-gray-500">
            Supports: PDF, DOCX, TXT, PNG, JPG (Max 10MB per file)
          </p>
        </label>
      {:else}
        <div class="space-y-2">
          <p class="font-medium text-gray-700">Selected files:</p>
          {#each files as file}
            <div class="text-sm text-gray-600">
              {file.name} ({formatBytes(file.size)})
            </div>
          {/each}

          <div class="flex justify-center space-x-3 mt-4">
            <button
              on:click={uploadFiles}
              disabled={uploading}
              class="btn btn-primary"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              on:click={() => files = []}
              disabled={uploading}
              class="btn btn-secondary"
            >
              Cancel
            </button>
          </div>

          {#if uploading}
            <div class="mt-4">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-primary-600 h-2 rounded-full transition-all"
                  style="width: {uploadProgress}%"
                ></div>
              </div>
              <p class="text-sm text-gray-600 mt-2">{uploadProgress}%</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Documents List -->
  <div class="card">
    <h3 class="text-xl font-semibold text-gray-900 mb-4">Your Documents</h3>

    {#if documents_list.length === 0}
      <p class="text-gray-500 text-center py-8">No documents yet. Upload your first document!</p>
    {:else}
      <div class="space-y-3">
        {#each documents_list as doc}
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div class="flex items-center space-x-4 flex-1">
              <span class="text-2xl">
                {doc.file_type === 'pdf' ? '📄' : doc.file_type === 'docx' ? '📝' : doc.file_type === 'txt' ? '📋' : '🖼️'}
              </span>

              <div class="flex-1">
                <h4 class="font-medium text-gray-900">{doc.filename}</h4>
                <div class="text-sm text-gray-600 space-x-4">
                  <span>{formatBytes(doc.file_size)}</span>
                  {#if doc.word_count}
                    <span>{doc.word_count} words</span>
                  {/if}
                  {#if doc.page_count}
                    <span>{doc.page_count} pages</span>
                  {/if}
                  <span>Uploaded: {formatDate(doc.created_at)}</span>
                </div>
              </div>

              <div>
                <span class="px-2 py-1 text-xs rounded {doc.status === 'completed' ? 'bg-green-100 text-green-800' : doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                  {doc.status}
                </span>
              </div>
            </div>

            <button
              on:click={() => deleteDocument(doc.id)}
              class="btn btn-danger btn-sm ml-4"
            >
              Delete
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
</style>
