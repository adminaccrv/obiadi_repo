/**
 * Google Drive REST API & OAuth Client for PulseMail Nexus
 * Uses Google Identity Services (GIS) and Google Drive API v3
 */

const GOOGLE_CLIENT_ID = '969717697624-e93i884ag3s6oq4kf2r3l74qcbeu35ut.apps.googleusercontent.com';
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

const TOKEN_STORAGE_KEY = 'NEXUS_GDRIVE_ACCESS_TOKEN';
const TOKEN_EXPIRY_KEY = 'NEXUS_GDRIVE_TOKEN_EXPIRY';
const USER_EMAIL_KEY = 'NEXUS_GDRIVE_USER_EMAIL';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  description?: string;
  parents?: string[];
}

export interface DriveNote {
  id: string;
  driveFileId?: string;
  title: string;
  content: string;
  category: 'campaign' | 'template' | 'idea' | 'checklist' | 'general';
  color: 'amber' | 'emerald' | 'violet' | 'rose' | 'sky' | 'slate';
  isPinned: boolean;
  tags: string[];
  updatedAt: string;
}

// Event emitter helper for reactive auth state
const listeners: Array<() => void> = [];
export function subscribeToDriveAuth(callback: () => void) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyAuthChange() {
  listeners.forEach((fn) => fn());
}

/**
 * Check if active Google Drive access token exists and is valid
 */
export function getDriveAccessToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY) || localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token) return null;
  if (expiry && Date.now() > Number(expiry)) {
    // Token expired
    clearDriveToken();
    return null;
  }
  return token;
}

export function isDriveConnected(): boolean {
  return !!getDriveAccessToken();
}

export function getDriveUserEmail(): string | null {
  return sessionStorage.getItem(USER_EMAIL_KEY) || localStorage.getItem(USER_EMAIL_KEY);
}

export function clearDriveToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  notifyAuthChange();
}

/**
 * Authorize Google Drive via Google Identity Services Token Client
 */
export async function authorizeGoogleDrive(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window is not defined'));
    }

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      return reject(
        new Error(
          'Google Identity Services SDK is not loaded. Please ensure you are online and refresh the page.'
        )
      );
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPES,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('Google Drive Auth Error:', tokenResponse);
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }

          if (tokenResponse.access_token) {
            const token = tokenResponse.access_token;
            const expiresIn = (tokenResponse.expires_in || 3599) * 1000;
            const expiryTime = (Date.now() + expiresIn).toString();

            sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
            sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime);
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
            localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime);

            // Fetch user info for profile display
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                if (userData.email) {
                  sessionStorage.setItem(USER_EMAIL_KEY, userData.email);
                  localStorage.setItem(USER_EMAIL_KEY, userData.email);
                }
              }
            } catch (err) {
              console.warn('Could not fetch user profile info:', err);
            }

            notifyAuthChange();
            resolve(token);
          } else {
            reject(new Error('No access token received from Google'));
          }
        },
        error_callback: (err: any) => {
          console.error('Google OAuth Client Error:', err);
          reject(new Error(err?.message || 'Authentication prompt cancelled or blocked.'));
        }
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Authenticated fetch helper for Google APIs
 */
async function driveFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected. Please connect your Google account.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearDriveToken();
    throw new Error('Google Drive authorization expired. Please re-authenticate.');
  }

  return res;
}

/**
 * Find or create the dedicated "PulseMail Nexus Workspace" folder in Google Drive
 */
let cachedFolderId: string | null = null;
export async function getOrCreateNexusFolder(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;

  const folderName = 'PulseMail Nexus Workspace';
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const searchRes = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id, name)&spaces=drive`
  );

  if (!searchRes.ok) {
    throw new Error(`Failed to search Drive folder: ${searchRes.statusText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    cachedFolderId = data.files[0].id;
    return cachedFolderId!;
  }

  // Create folder
  const createRes = await driveFetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Files, notes, templates, and backups managed by PulseMail Nexus',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create Nexus folder: ${createRes.statusText}`);
  }

  const newFolder = await createRes.json();
  cachedFolderId = newFolder.id;
  return cachedFolderId!;
}

/**
 * List files in Google Drive (Nexus folder and root app files)
 */
export async function listDriveFiles(searchTerm?: string): Promise<DriveFileItem[]> {
  let query = "trashed = false";
  if (searchTerm && searchTerm.trim()) {
    query += ` and name contains '${searchTerm.trim()}'`;
  }

  const res = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(
      query
    )}&orderBy=modifiedTime desc&pageSize=50&fields=files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, iconLink, description, parents)`
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to list files: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Get file text content from Google Drive
 */
export async function getDriveFileText(fileId: string): Promise<string> {
  const res = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`);
  if (!res.ok) {
    throw new Error(`Failed to download file content: ${res.statusText}`);
  }
  return res.text();
}

/**
 * Delete a file from Google Drive
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const res = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete file from Drive: ${res.statusText}`);
  }
}

/**
 * Create or update a text note in Google Drive (stored under PulseMail Nexus Workspace folder)
 */
export async function saveNoteToDrive(note: DriveNote): Promise<DriveFileItem> {
  const folderId = await getOrCreateNexusFolder();
  const fileName = `[Note] ${note.title || 'Untitled Note'}.json`;

  const notePayload = JSON.stringify(
    {
      ...note,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  );

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `PulseMail Note • Category: ${note.category} • Color: ${note.color}`,
    parents: [folderId],
  };

  // If note already has a drive file ID, update it
  if (note.driveFileId) {
    return await updateDriveFileContent(note.driveFileId, notePayload, metadata.name);
  }

  // Otherwise, upload as a new multipart file
  return await uploadMultipartFile(metadata, notePayload, 'application/json');
}

/**
 * Update an existing Drive file content
 */
export async function updateDriveFileContent(
  fileId: string,
  content: string,
  newFileName?: string
): Promise<DriveFileItem> {
  if (newFileName) {
    // Update metadata first
    await driveFetch(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFileName }),
    });
  }

  const uploadRes = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    }
  );

  if (!uploadRes.ok) {
    throw new Error(`Failed to update Drive file: ${uploadRes.statusText}`);
  }

  return uploadRes.json();
}

/**
 * Upload arbitrary file (CSV, HTML, image, etc.) directly to Google Drive
 */
export async function uploadFileToDrive(
  file: File,
  customName?: string
): Promise<DriveFileItem> {
  const folderId = await getOrCreateNexusFolder();
  const metadata = {
    name: customName || file.name,
    mimeType: file.type || 'application/octet-stream',
    parents: [folderId],
    description: `Uploaded from PulseMail Nexus on ${new Date().toLocaleDateString()}`,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const token = getDriveAccessToken();
  const res = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload failed: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Upload multipart text/json data helper
 */
async function uploadMultipartFile(
  metadata: any,
  bodyContent: string,
  contentType: string
): Promise<DriveFileItem> {
  const token = getDriveAccessToken();
  const boundary = '-------PulseMailNexusMultipartBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${contentType}; charset=UTF-8\r\n\r\n` +
    bodyContent +
    closeDelimiter;

  const res = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create file: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Export full Templates collection to Google Drive as an archive
 */
export async function exportTemplatesArchiveToDrive(templates: any[]): Promise<DriveFileItem> {
  const folderId = await getOrCreateNexusFolder();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `PulseMail_Templates_Archive_${timestamp}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Complete backup of ${templates.length} email templates from PulseMail Nexus`,
    parents: [folderId],
  };

  const payload = JSON.stringify(
    {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      source: 'PulseMail Nexus Content Foundry',
      totalCount: templates.length,
      templates,
    },
    null,
    2
  );

  return uploadMultipartFile(metadata, payload, 'application/json');
}

/**
 * Export Recipients List to Google Drive as a clean CSV file
 */
export async function exportRecipientsCsvToDrive(recipients: any[]): Promise<DriveFileItem> {
  const folderId = await getOrCreateNexusFolder();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `PulseMail_Recipients_${timestamp}.csv`;

  const csvHeader = 'Email,Name,Status,LastActive\n';
  const csvRows = recipients
    .map(
      (r) =>
        `"${(r.email || '').replace(/"/g, '""')}","${(r.name || '').replace(/"/g, '""')}","${r.status || 'verified'}","${r.lastActive || ''}"`
    )
    .join('\n');
  const csvContent = csvHeader + csvRows;

  const metadata = {
    name: fileName,
    mimeType: 'text/csv',
    description: `Recipients list backup containing ${recipients.length} target nodes`,
    parents: [folderId],
  };

  return uploadMultipartFile(metadata, csvContent, 'text/csv');
}
