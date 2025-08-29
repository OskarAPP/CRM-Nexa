// --- Tabs ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
  });
});

// --- Convertir archivo a base64 y mostrar vista previa ---
document.getElementById('mediaFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Detectar tipo de medio basado en el tipo MIME
  const mimeType = file.type;
  let mediaType = 'document'; // Por defecto
  
  if (mimeType.startsWith('image/')) {
    mediaType = 'image';
  } else if (mimeType.startsWith('video/')) {
    mediaType = 'video';
  } else if (mimeType.startsWith('audio/')) {
    mediaType = 'audio';
  }

  // Actualizar la visualización del tipo detectado
  const autoTypeDiv = document.getElementById('autoType');
  autoTypeDiv.innerHTML = `
    <div class="type-info">
      <div>
        <span class="type-badge media">
          <i class="fas ${getMediaIcon(mediaType)}"></i>${mediaType.toUpperCase()}
        </span>
        <span class="type-badge mime">
          <i class="fas fa-code"></i>${mimeType}
        </span>
      </div>
      <small style="margin-top: 0.5rem; color: var(--secondary);">
        Detectado automáticamente desde el archivo
      </small>
    </div>
  `;

  // Guardar los valores para el envío
  document.getElementById('media').dataset.mediatype = mediaType;
  document.getElementById('media').dataset.mimetype = mimeType;

  const reader = new FileReader();
  reader.onload = function() {
    const base64 = reader.result.split(',')[1];
    document.getElementById('media').value = base64;
    document.getElementById('fileName').value = file.name;
    
    // Mostrar vista previa
    const previewContent = document.getElementById('preview-content');
    previewContent.innerHTML = '';
    
    if (mediaType === 'image') {
      const img = document.createElement('img');
      img.src = reader.result;
      previewContent.appendChild(img);
    } else if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = reader.result;
      video.controls = true;
      previewContent.appendChild(video);
    } else if (mediaType === 'audio') {
      const audio = document.createElement('audio');
      audio.src = reader.result;
      audio.controls = true;
      previewContent.appendChild(audio);
    } else {
      previewContent.innerHTML = `
        <p><i class="fas fa-file"></i> ${file.name} (${mimeType})</p>
        <p><small>${formatFileSize(file.size)}</small></p>
      `;
    }
  };
  reader.readAsDataURL(file);
});

// Función auxiliar para obtener iconos según el tipo de medio
function getMediaIcon(mediaType) {
  const icons = {
    'image': 'fa-image',
    'video': 'fa-video',
    'audio': 'fa-music',
    'document': 'fa-file'
  };
  return icons[mediaType] || 'fa-file';
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- Enviar textos ---
async function enviarMensajes() {
  const numeros = document.getElementById('numeros').value.split(',').map(n => n.trim());
  const mensaje = document.getElementById('mensaje').value;
  const resultados = document.getElementById('resultados');
  
  // Validación básica
  if (!numeros.length || numeros.some(n => !n)) {
    resultados.textContent = "Error: Debe ingresar al menos un número válido";
    return;
  }
  
  if (!mensaje.trim()) {
    resultados.textContent = "Error: El mensaje no puede estar vacío";
    return;
  }
  
  resultados.textContent = "Enviando mensajes...";
  
  try {
    const response = await fetch('http://127.0.0.1:8000/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numeros, mensaje })
    });
    const data = await response.json();
    resultados.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    resultados.textContent = "Error: " + error.message;
  }
}

// --- Enviar medios ---
async function enviarMedios() {
  const numeros = document.getElementById('media-numeros').value.split(',').map(n => n.trim());
  const media = document.getElementById('media').value;
  const fileName = document.getElementById('fileName').value;
  const caption = document.getElementById('caption').value;
  const resultados = document.getElementById('resultados');
  
  // Obtener los valores detectados automáticamente
  const mediatype = document.getElementById('media').dataset.mediatype || 'document';
  const mimetype = document.getElementById('media').dataset.mimetype || 'application/octet-stream';
  
  // Validación básica
  if (!numeros.length || numeros.some(n => !n)) {
    resultados.textContent = "Error: Debe ingresar al menos un número válido";
    return;
  }
  
  if (!media.trim()) {
    resultados.textContent = "Error: Debe seleccionar un archivo para enviar";
    return;
  }
  
  if (!fileName.trim()) {
    resultados.textContent = "Error: Debe proporcionar un nombre de archivo";
    return;
  }
  
  resultados.textContent = "Enviando medios...";

  try {
    const response = await fetch('http://127.0.0.1:8000/api/send-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        numeros, 
        mediatype, 
        mimetype, 
        media, 
        fileName, 
        caption,
        delay: 1000, 
        linkPreview: false
      })
    });
    const data = await response.json();
    resultados.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    resultados.textContent = "Error: " + error.message;
  }
}

// Limpiar resultados
function clearResults() {
  document.getElementById('resultados').textContent = '';
}