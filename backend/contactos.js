// Variables globales para almacenar los contactos
let allContacts = [];
let filteredContacts = [];
let currentFilter = 'all';
let activeAreaCodes = [];
let selectedContacts = new Set(); // Nuevo: Set para contactos seleccionados

// Mapeo de códigos de país a banderas (usando flag-icons)
const countryCodeToFlag = {
  '1': 'us',    // Estados Unidos
  '521': 'mx',   // México
  '34': 'es',   // España
  '54': 'ar',   // Argentina
  '55': 'br',   // Brasil
  '56': 'cl',   // Chile
  '57': 'co',   // Colombia
  '58': 've',   // Venezuela
  '51': 'pe',   // Perú
  '593': 'ec',  // Ecuador
  '591': 'bo',  // Bolivia
  '598': 'uy',  // Uruguay
  '595': 'py',  // Paraguay
  '507': 'pa',  // Panamá
  '506': 'cr',  // Costa Rica
  '503': 'sv',  // El Salvador
  '502': 'gt',  // Guatemala
  '504': 'hn',  // Honduras
  '505': 'ni',  // Nicaragua
  '53': 'cu',   // Cuba
  '509': 'ht',  // Haití
  '1809': 'do', // República Dominicana
  '1829': 'do', // República Dominicana
  '1849': 'do'  // República Dominicana
};

async function findContacts() {
  const container = document.getElementById("contacts");
  container.innerHTML = `
    <div class="loading">
      <i class="fas fa-circle-notch fa-spin"></i>
      <h3>Cargando contactos</h3>
      <p>Estamos obteniendo y organizando su información de contacto</p>
    </div>
  `;

  try {
    const response = await fetch("http://127.0.0.1:8000/api/find-contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const data = await response.json();

    // Si hay contactos
    if (Array.isArray(data) && data.length > 0) {
      allContacts = data;
      filteredContacts = [...allContacts];
      selectedContacts.clear(); // Limpiar selección al cargar nuevos contactos
      updateSelectionInfo();
      renderContacts();
    } else {
      showEmptyState();
    }

  } catch (error) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error de conexión</h3>
        <p>No se pudo conectar con el servidor: ${error}</p>
      </div>
    `;
    document.getElementById("count").textContent = "Error";
  }
}

// Nuevo: Función para seleccionar/deseleccionar contacto
function toggleContactSelection(contactId) {
  if (selectedContacts.has(contactId)) {
    selectedContacts.delete(contactId);
  } else {
    selectedContacts.add(contactId);
  }
  
  updateSelectionInfo();
  updateExportButton();
}

// Nuevo: Seleccionar todos los contactos visibles
function selectAllContacts() {
  filteredContacts.forEach(contact => {
    const contactId = contact.remoteJid;
    selectedContacts.add(contactId);
  });
  
  updateSelectionInfo();
  updateExportButton();
  renderContacts(); // Re-renderizar para mostrar selección
}

// Nuevo: Deseleccionar todos los contactos
function deselectAllContacts() {
  selectedContacts.clear();
  updateSelectionInfo();
  updateExportButton();
  renderContacts(); // Re-renderizar para quitar selección
}

// Nuevo: Actualizar información de selección
function updateSelectionInfo() {
  const selectionInfo = document.getElementById('selectionInfo');
  const selectedCount = document.getElementById('selectedCount');
  
  if (selectedContacts.size > 0) {
    selectionInfo.classList.add('show');
    selectedCount.textContent = selectedContacts.size;
  } else {
    selectionInfo.classList.remove('show');
  }
}

// Nuevo: Actualizar estado del botón de exportación
function updateExportButton() {
  const exportBtn = document.getElementById('exportBtn');
  exportBtn.disabled = selectedContacts.size === 0;
}

// Nuevo: Exportar contactos seleccionados a CSV
function exportSelectedContacts() {
  if (selectedContacts.size === 0) return;
  
  const selectedContactData = allContacts.filter(contact => 
    selectedContacts.has(contact.remoteJid)
  );
  
  // Crear contenido CSV
  let csvContent = "Nombre,Número,Tipo\n";
  
  selectedContactData.forEach(contact => {
    const name = contact.pushName || "Sin nombre";
    const jid = contact.remoteJid || "";
    const number = jid.split("@")[0] || "N/A";
    const isGroup = jid.includes("g.us");
    const type = isGroup ? "Grupo" : "Contacto";
    
    // Escapar comas y comillas en el nombre
    const escapedName = `"${name.replace(/"/g, '""')}"`;
    
    csvContent += `${escapedName},${number},${type}\n`;
  });
  
  // Crear y descargar archivo
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `contactos_seleccionados_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Mostrar mensaje de éxito
  showExportSuccess(selectedContacts.size);
}

// Nuevo: Mostrar mensaje de exportación exitosa
function showExportSuccess(count) {
  // Crear notificación temporal
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--success);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: var(--card-shadow);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <i class="fas fa-check-circle"></i>
      <span>${count} contactos exportados exitosamente</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Agregar estilos de animación para la notificación
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Función para procesar múltiples códigos de área
function parseAreaCodes(areaCodesString) {
  if (!areaCodesString.trim()) return [];
  
  return areaCodesString
    .split(',')
    .map(code => code.trim())
    .filter(code => code !== '' && /^\d+$/.test(code));
}

// Función para mostrar chips de códigos de área activos
function renderAreaChips() {
  const chipsContainer = document.getElementById('areaChipsContainer');
  if (!chipsContainer) return;
  
  if (activeAreaCodes.length === 0) {
    chipsContainer.style.display = 'none';
    return;
  }
  
  chipsContainer.style.display = 'block';
  chipsContainer.innerHTML = activeAreaCodes.map(code => `
    <div class="area-chip">
      ${code}
      <button class="remove-chip" onclick="removeAreaCode('${code}')">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

// Función para remover un código de área específico
function removeAreaCode(code) {
  activeAreaCodes = activeAreaCodes.filter(c => c !== code);
  renderAreaChips();
  
  // Si no hay más códigos, limpiar el input
  if (activeAreaCodes.length === 0) {
    document.getElementById('areaCodes').value = '';
  } else {
    // Actualizar el input con los códigos restantes
    document.getElementById('areaCodes').value = activeAreaCodes.join(', ');
  }
}

// Nueva función: Aplicar filtros avanzados
async function applyAdvancedFilters() {
  const countryCode = document.getElementById('countryCode').value.trim();
  const areaCodesString = document.getElementById('areaCodes').value.trim();
  
  // Validaciones básicas
  if (countryCode && !/^\d+$/.test(countryCode)) {
    alert('El código de país debe contener solo dígitos');
    return;
  }
  
  // Procesar múltiples códigos de área
  const areaCodes = parseAreaCodes(areaCodesString);
  
  if (areaCodes.length > 0) {
    // Validar cada código de área
    const invalidCodes = areaCodes.filter(code => !/^\d+$/.test(code));
    if (invalidCodes.length > 0) {
      alert('Los códigos de área deben contener solo dígitos. Códigos inválidos: ' + invalidCodes.join(', '));
      return;
    }
    
    // Actualizar códigos activos
    activeAreaCodes = [...new Set(areaCodes)]; // Eliminar duplicados
    renderAreaChips();
  } else {
    activeAreaCodes = [];
    renderAreaChips();
  }
  
  const container = document.getElementById("contacts");
  container.innerHTML = `
    <div class="loading">
      <i class="fas fa-filter fa-spin"></i>
      <h3>Aplicando filtros</h3>
      <p>Filtrando contactos por código de país y áreas...</p>
    </div>
  `;

  try {
    const filterData = {
      country_code: countryCode || '521'
    };
    
    // Si hay códigos de área, enviarlos como array
    if (activeAreaCodes.length > 0) {
      filterData.area_codes = activeAreaCodes;
    }

    const response = await fetch("http://127.0.0.1:8000/api/filter-contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(filterData)
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }
    
    // Actualizar los contactos con los resultados filtrados
    if (data.matched_contacts && data.matched_contacts.length > 0) {
      allContacts = data.matched_contacts;
      filteredContacts = [...allContacts];
      selectedContacts.clear(); // Limpiar selección al aplicar nuevos filtros
      updateSelectionInfo();
      updateExportButton();
      renderContacts();
      
      // Mostrar información del filtro aplicado
      showFilterInfo(data);
    } else {
      showEmptyStateWithFilter(data);
    }

  } catch (error) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error al filtrar</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function showFilterInfo(data) {
  const countryCode = document.getElementById('countryCode').value.trim() || '521';
  
  let filterText = `Filtro: País ${countryCode}`;
  if (activeAreaCodes.length > 0) {
    filterText += `, Áreas: ${activeAreaCodes.join(', ')}`;
  }
  
  filterText += ` | Encontrados: ${data.filtered_count} de ${data.total_jids_found}`;
  
  console.log(filterText);
}

function showEmptyStateWithFilter(data) {
  const container = document.getElementById("contacts");
  const countElement = document.getElementById("count");
  
  const countryCode = document.getElementById('countryCode').value.trim() || '521';
  
  let filterDetails = `Código de país: ${countryCode}`;
  if (activeAreaCodes.length > 0) {
    filterDetails += `, Códigos de área: ${activeAreaCodes.join(', ')}`;
  }
  
  container.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-filter"></i>
      <h3>No se encontraron contactos con este filtro</h3>
      <p>${filterDetails}</p>
      <p>Se encontraron ${data.total_jids_found} contactos en total, pero ninguno coincide con los criterios.</p>
    </div>
  `;
  countElement.textContent = `0 de ${data.total_jids_found} contactos`;
}

function formatPhoneNumber(number) {
  // Eliminar el código de país para el formato
  const cleanNumber = number.replace(/^\+?(\d+)/, '$1');
  const countryCode = cleanNumber.substring(0, 3);
  const mainNumber = cleanNumber.substring(3);
  
  // Formatear según la longitud del número
  if (mainNumber.length === 10) {
    return `+${countryCode} ${mainNumber.substring(0, 3)}-${mainNumber.substring(3, 6)}-${mainNumber.substring(6)}`;
  } else if (mainNumber.length === 8) {
    return `+${countryCode} ${mainNumber.substring(0, 4)}-${mainNumber.substring(4)}`;
  }
  
  // Si no coincide con los formatos comunes, devolver el número original
  return `+${cleanNumber}`;
}

function getCountryFlag(countryCode) {
  return countryCodeToFlag[countryCode] || 'question';
}

function getCountryName(countryCode) {
  const countryNames = {
    'mx': 'México',
    'us': 'Estados Unidos',
    'es': 'España',
    'ar': 'Argentina',
    'br': 'Brasil',
    'cl': 'Chile',
    'co': 'Colombia',
    've': 'Venezuela',
    'pe': 'Perú',
    'ec': 'Ecuador',
    'bo': 'Bolivia',
    'uy': 'Uruguay',
    'py': 'Paraguay',
    'pa': 'Panamá',
    'cr': 'Costa Rica',
    'sv': 'El Salvador',
    'gt': 'Guatemala',
    'hn': 'Honduras',
    'ni': 'Nicaragua',
    'cu': 'Cuba',
    'ht': 'Haití',
    'do': 'República Dominicana'
  };
  return countryNames[countryCode] || `Código ${countryCode}`;
}

function renderContacts() {
  const container = document.getElementById("contacts");
  const countElement = document.getElementById("count");
  
  if (filteredContacts.length > 0) {
    countElement.textContent = `${filteredContacts.length} de ${allContacts.length} contactos`;
    
    container.innerHTML = "";
    filteredContacts.forEach(contact => {
      const name = contact.pushName || "Sin nombre";
      const jid = contact.remoteJid || "";
      const number = jid.split("@")[0] || "N/A";
      const pic = contact.profilePicUrl;
      const initials = name.charAt(0).toUpperCase() || "?";
      
      // Determinar si es contacto o grupo
      const isGroup = jid.includes("g.us");
      const type = isGroup ? "group" : "contact";
      const typeText = isGroup ? "Grupo" : "Contacto";
      
      // Extraer código de país y formatear número
      let countryCode = '';
      let formattedNumber = number;
      let flagCode = 'question';
      
      if (number && number.length > 3) {
        countryCode = number.substring(0, 3);
        formattedNumber = formatPhoneNumber(number);
        flagCode = getCountryFlag(countryCode);
      }
      
      // Verificar si está seleccionado
      const isSelected = selectedContacts.has(jid);
      
      const card = document.createElement("div");
      card.className = `contact-card ${type} ${isSelected ? 'selected' : ''}`;
      card.onclick = (e) => {
        // Evitar que el click en el checkbox active ambos eventos
        if (!e.target.classList.contains('contact-checkbox')) {
          toggleContactSelection(jid);
          renderContacts(); // Re-renderizar para actualizar estado visual
        }
      };
      
      // Checkbox de selección
      const checkbox = document.createElement("div");
      checkbox.className = "contact-checkbox";
      checkbox.onclick = (e) => {
        e.stopPropagation(); // Evitar que el click se propague a la tarjeta
        toggleContactSelection(jid);
        renderContacts(); // Re-renderizar para actualizar estado visual
      };
      card.appendChild(checkbox);
      
      // Avatar con imagen o iniciales
      const avatar = document.createElement("div");
      if (pic) {
        avatar.style.backgroundImage = `url(${pic})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
      } else {
        avatar.textContent = initials;
      }
      avatar.className = `avatar ${type}`;
      
      // Badge para indicar tipo
      const badge = document.createElement("div");
      badge.className = `badge ${type}`;
      badge.innerHTML = isGroup ? '<i class="fas fa-users"></i>' : '<i class="fas fa-user"></i>';
      avatar.appendChild(badge);
      
      card.appendChild(avatar);
      
      // Información de contacto
      const info = document.createElement("div");
      info.className = "contact-info";
      
      info.innerHTML = `
        <div>
          <span class="contact-type type-${type}">${typeText}</span>
        </div>
        <h3 class="contact-name">${name}</h3>
        <p class="contact-number">
          ${flagCode !== 'question' ? 
            `<span class="fi fi-${flagCode} country-flag" title="${getCountryName(flagCode)}"></span>` : 
            '<i class="fas fa-question-circle" style="color: #94a3b8;"></i>'
          }
          ${formattedNumber}
        </p>
      `;
      card.appendChild(info);
      
      container.appendChild(card);
    });
  } else {
    showEmptyState();
  }
}

function showEmptyState() {
  const container = document.getElementById("contacts");
  const countElement = document.getElementById("count");
  
  if (allContacts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-slash"></i>
        <h3>No se encontraron contactos</h3>
        <p>Intente sincronizar nuevamente o verifique su conexión</p>
      </div>
    `;
    countElement.textContent = "0 contactos";
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-filter"></i>
        <h3>No hay contactos con este filtro</h3>
        <p>Intente con otro filtro o limpie los filtros actuales</p>
      </div>
    `;
    countElement.textContent = `0 de ${allContacts.length} contactos`;
  }
}

function filterContacts(type) {
  currentFilter = type;
  
  // Actualizar botones de filtro
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.filter-btn[onclick="filterContacts('${type}')"]`).classList.add('active');
  
  // Aplicar filtro
  applyFilters();
}

function applyFilters() {
  // Aplicar filtro de tipo (contacto/grupo)
  if (currentFilter === 'all') {
    filteredContacts = [...allContacts];
  } else if (currentFilter === 'contact') {
    filteredContacts = allContacts.filter(contact => 
      contact.remoteJid && contact.remoteJid.includes("@s.whatsapp.net")
    );
  } else if (currentFilter === 'group') {
    filteredContacts = allContacts.filter(contact => 
      contact.remoteJid && contact.remoteJid.includes("@g.us")
    );
  }
  
  renderContacts();
}

function clearFilters() {
  // Restablecer filtros
  currentFilter = 'all';
  
  // Limpiar filtros avanzados
  document.getElementById('countryCode').value = '521';
  document.getElementById('areaCodes').value = '';
  activeAreaCodes = [];
  renderAreaChips();
  
  // Limpiar selección
  selectedContacts.clear();
  updateSelectionInfo();
  updateExportButton();
  
  // Actualizar UI
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.filter-btn[onclick="filterContacts('all')"]`).classList.add('active');
  
  // Recargar contactos originales
  if (allContacts.length > 0) {
    filteredContacts = [...allContacts];
    renderContacts();
  } else {
    // Si no hay contactos, mostrar estado inicial
    document.getElementById("contacts").innerHTML = `
      <div class="empty-state">
        <i class="fas fa-address-book"></i>
        <h3>Lista de contactos vacía</h3>
        <p>Haga clic en "Sincronizar Contactos" para comenzar</p>
      </div>
    `;
    document.getElementById("count").textContent = "0 contactos";
  }
}

function toggleRawData() {
  const rawContent = document.getElementById("raw-content");
  const toggleText = document.getElementById("toggle-text");
  
  if (rawContent.classList.contains("show")) {
    rawContent.classList.remove("show");
    toggleText.textContent = "Mostrar JSON";
  } else {
    rawContent.classList.add("show");
    toggleText.textContent = "Ocultar JSON";
  }
}

// Inicializar vista
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("contacts").innerHTML = `
    <div class="empty-state">
      <i class="fas fa-address-book"></i>
      <h3>Lista de contactos vacía</h3>
      <p>Haga clic en "Sincronizar Contactos" para comenzar</p>
    </div>
  `;
});