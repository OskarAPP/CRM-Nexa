// Variables globales para almacenar los contactos
let allContacts = [];
let filteredContacts = [];
let currentFilter = 'all';

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
      
      const card = document.createElement("div");
      card.className = `contact-card ${type}`;
      
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
        <p class="contact-number">+${number}</p>
      `;
      card.appendChild(info);
      
      // Acciones
      const actions = document.createElement("div");
      actions.className = "contact-actions";
      actions.innerHTML = `
        <button class="action-btn">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      `;
      card.appendChild(actions);
      
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
  
  // Actualizar UI
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.filter-btn[onclick="filterContacts('all')"]`).classList.add('active');
  
  // Aplicar filtros
  applyFilters();
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