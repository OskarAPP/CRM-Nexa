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

  const reader = new FileReader();
  reader.onload = function() {
    // reader.result trae: "data:mime/type;base64,AAAA..."
    const base64 = reader.result.split(',')[1];
    document.getElementById('media').value = base64;
    document.getElementById('fileName').value = file.name;
    
    // Mostrar vista previa
    const previewContent = document.getElementById('preview-content');
    const mediatype = document.getElementById('mediatype').value;
    
    previewContent.innerHTML = '';
    
    if (mediatype === 'image') {
      const img = document.createElement('img');
      img.src = reader.result;
      previewContent.appendChild(img);
    } else if (mediatype === 'video') {
      const video = document.createElement('video');
      video.src = reader.result;
      video.controls = true;
      previewContent.appendChild(video);
    } else {
      previewContent.innerHTML = `<p><i class="fas fa-file"></i> ${file.name} (${file.type})</p>`;
    }
  };
  reader.readAsDataURL(file);
});

// Actualizar vista previa cuando cambie el tipo de medio
document.getElementById('mediatype').addEventListener('change', function() {
  const mediaValue = document.getElementById('media').value;
  if (mediaValue) {
    // Disparar evento change para regenerar vista previa
    document.getElementById('mediaFile').dispatchEvent(new Event('change'));
  }
});

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
  const mediatype = document.getElementById('mediatype').value;
  const mimetype = document.getElementById('mimetype').value;
  const media = document.getElementById('media').value;
  const fileName = document.getElementById('fileName').value;
  const caption = document.getElementById('caption').value;
  const resultados = document.getElementById('resultados');
  
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
        numeros, mediatype, mimetype, media, fileName, caption,
        delay: 1000, linkPreview: false
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