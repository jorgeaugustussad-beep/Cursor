/*
  Universo Sci‑Fi - Cadastro
  - Hierarquia: Galáxia → Sistema Estelar → Corpo Celeste (Planeta/Lua/Asteróide) → Cidade → Personagens/População
  - Recursos: CRUD completo, transferência de personagens, múltiplos tipos de população, total automático e gráfico de pizza, persistência em localStorage.
*/

(function() {
  const STORAGE_KEY = 'sciFiUniverseDataV1';

  function showToast(message, timeoutMs = 2200) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.add('hidden'), timeoutMs);
  }

  function generateId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-6)}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hashToHue(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  }

  function colorFromString(label, s = 70, l = 55) {
    const hue = hashToHue(label || 'x');
    return `hsl(${hue} ${s}% ${l}%)`;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  class UniverseStore {
    constructor() {
      this.state = { galaxies: [] };
      this.load();
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.galaxies)) {
            this.state = parsed;
          }
        }
      } catch (err) {
        console.error('Falha ao carregar dados', err);
      }
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        console.error('Falha ao salvar dados', err);
      }
    }

    // Finders
    getGalaxy(galaxyId) {
      return this.state.galaxies.find(g => g.id === galaxyId);
    }

    getSystemAndGalaxy(systemId) {
      for (const galaxy of this.state.galaxies) {
        const system = galaxy.starSystems.find(s => s.id === systemId);
        if (system) return { system, galaxy };
      }
      return null;
    }

    getBodyAndSystem(bodyId) {
      for (const galaxy of this.state.galaxies) {
        for (const system of galaxy.starSystems) {
          const body = system.bodies.find(b => b.id === bodyId);
          if (body) return { body, system, galaxy };
        }
      }
      return null;
    }

    getCityAndBody(cityId) {
      for (const galaxy of this.state.galaxies) {
        for (const system of galaxy.starSystems) {
          for (const body of system.bodies) {
            const city = body.cities.find(c => c.id === cityId);
            if (city) return { city, body, system, galaxy };
          }
        }
      }
      return null;
    }

    // Aggregates
    getCityPopulationTotal(cityId) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return 0;
      return ref.city.populationGroups.reduce((sum, g) => sum + (Number(g.count) || 0), 0);
    }

    getBodyPopulationBreakdown(bodyId) {
      const ref = this.getBodyAndSystem(bodyId);
      if (!ref) return { total: 0, byType: new Map() };
      const byType = new Map();
      let total = 0;
      for (const city of ref.body.cities) {
        for (const grp of city.populationGroups) {
          const key = (grp.typeName || '').trim() || 'Outros';
          const count = Number(grp.count) || 0;
          total += count;
          byType.set(key, (byType.get(key) || 0) + count);
        }
      }
      return { total, byType };
    }

    // CRUD: Galáxia
    addGalaxy({ name, description }) {
      const galaxy = { id: generateId('gal'), name: name?.trim() || 'Galáxia sem nome', description: description?.trim() || '', starSystems: [] };
      this.state.galaxies.push(galaxy);
      this.save();
      return galaxy;
    }

    updateGalaxy(galaxyId, { name, description }) {
      const galaxy = this.getGalaxy(galaxyId);
      if (!galaxy) return false;
      if (typeof name === 'string') galaxy.name = name.trim();
      if (typeof description === 'string') galaxy.description = description.trim();
      this.save();
      return true;
    }

    deleteGalaxy(galaxyId) {
      const idx = this.state.galaxies.findIndex(g => g.id === galaxyId);
      if (idx >= 0) {
        this.state.galaxies.splice(idx, 1);
        this.save();
        return true;
      }
      return false;
    }

    // CRUD: Sistema Estelar
    addStarSystem(galaxyId, { name, description }) {
      const galaxy = this.getGalaxy(galaxyId);
      if (!galaxy) return null;
      const system = { id: generateId('sys'), name: name?.trim() || 'Sistema sem nome', description: description?.trim() || '', bodies: [] };
      galaxy.starSystems.push(system);
      this.save();
      return system;
    }

    updateStarSystem(systemId, { name, description }) {
      const ref = this.getSystemAndGalaxy(systemId);
      if (!ref) return false;
      if (typeof name === 'string') ref.system.name = name.trim();
      if (typeof description === 'string') ref.system.description = description.trim();
      this.save();
      return true;
    }

    deleteStarSystem(systemId) {
      for (const galaxy of this.state.galaxies) {
        const idx = galaxy.starSystems.findIndex(s => s.id === systemId);
        if (idx >= 0) {
          galaxy.starSystems.splice(idx, 1);
          this.save();
          return true;
        }
      }
      return false;
    }

    // CRUD: Corpo Celeste
    addBody(systemId, { type, name, description }) {
      const ref = this.getSystemAndGalaxy(systemId);
      if (!ref) return null;
      const safeType = ['planeta','lua','asteroide'].includes((type || '').toLowerCase()) ? type.toLowerCase() : 'planeta';
      const body = { id: generateId('bod'), type: safeType, name: name?.trim() || 'Corpo sem nome', description: description?.trim() || '', cities: [] };
      ref.system.bodies.push(body);
      this.save();
      return body;
    }

    updateBody(bodyId, { type, name, description }) {
      const ref = this.getBodyAndSystem(bodyId);
      if (!ref) return false;
      if (typeof type === 'string') {
        const safeType = ['planeta','lua','asteroide'].includes(type.toLowerCase()) ? type.toLowerCase() : ref.body.type;
        ref.body.type = safeType;
      }
      if (typeof name === 'string') ref.body.name = name.trim();
      if (typeof description === 'string') ref.body.description = description.trim();
      this.save();
      return true;
    }

    deleteBody(bodyId) {
      const ref = this.getBodyAndSystem(bodyId);
      if (!ref) return false;
      const idx = ref.system.bodies.findIndex(b => b.id === bodyId);
      if (idx >= 0) {
        ref.system.bodies.splice(idx, 1);
        this.save();
        return true;
      }
      return false;
    }

    // CRUD: Cidade
    addCity(bodyId, { name, description }) {
      const ref = this.getBodyAndSystem(bodyId);
      if (!ref) return null;
      const city = { id: generateId('city'), name: name?.trim() || 'Cidade sem nome', description: description?.trim() || '', characters: [], populationGroups: [] };
      ref.body.cities.push(city);
      this.save();
      return city;
    }

    updateCity(cityId, { name, description }) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return false;
      if (typeof name === 'string') ref.city.name = name.trim();
      if (typeof description === 'string') ref.city.description = description.trim();
      this.save();
      return true;
    }

    deleteCity(cityId) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return false;
      const idx = ref.body.cities.findIndex(c => c.id === cityId);
      if (idx >= 0) {
        ref.body.cities.splice(idx, 1);
        this.save();
        return true;
      }
      return false;
    }

    // CRUD: Personagem
    addCharacter(cityId, { name, species, role, age, notes }) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return null;
      const ch = {
        id: generateId('char'),
        name: name?.trim() || 'Sem nome',
        species: species?.trim() || '',
        role: role?.trim() || '',
        age: Number(age) || null,
        notes: notes?.trim() || ''
      };
      ref.city.characters.push(ch);
      this.save();
      return ch;
    }

    updateCharacter(cityId, characterId, { name, species, role, age, notes }) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return false;
      const ch = ref.city.characters.find(c => c.id === characterId);
      if (!ch) return false;
      if (typeof name === 'string') ch.name = name.trim();
      if (typeof species === 'string') ch.species = species.trim();
      if (typeof role === 'string') ch.role = role.trim();
      if (age !== undefined) ch.age = Number(age) || null;
      if (typeof notes === 'string') ch.notes = notes.trim();
      this.save();
      return true;
    }

    deleteCharacter(cityId, characterId) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return false;
      const idx = ref.city.characters.findIndex(c => c.id === characterId);
      if (idx >= 0) {
        ref.city.characters.splice(idx, 1);
        this.save();
        return true;
      }
      return false;
    }

    transferCharacter(fromCityId, toCityId, characterId) {
      if (fromCityId === toCityId) return false;
      const from = this.getCityAndBody(fromCityId);
      const to = this.getCityAndBody(toCityId);
      if (!from || !to) return false;
      const idx = from.city.characters.findIndex(c => c.id === characterId);
      if (idx < 0) return false;
      const [ch] = from.city.characters.splice(idx, 1);
      to.city.characters.push(ch);
      this.save();
      return true;
    }

    // CRUD: População (por cidade)
    addPopulationGroup(cityId, { typeName, count }) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return null;
      const grp = { id: generateId('pop'), typeName: (typeName || '').trim() || 'Outros', count: clamp(Number(count) || 0, 0, Number.MAX_SAFE_INTEGER) };
      ref.city.populationGroups.push(grp);
      this.save();
      return grp;
    }

    updatePopulationGroup(cityId, groupId, { typeName, count }) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return false;
      const grp = ref.city.populationGroups.find(g => g.id === groupId);
      if (!grp) return false;
      if (typeof typeName === 'string') grp.typeName = typeName.trim() || 'Outros';
      if (count !== undefined) grp.count = clamp(Number(count) || 0, 0, Number.MAX_SAFE_INTEGER);
      this.save();
      return true;
    }

    deletePopulationGroup(cityId, groupId) {
      const ref = this.getCityAndBody(cityId);
      if (!ref) return false;
      const idx = ref.city.populationGroups.findIndex(g => g.id === groupId);
      if (idx >= 0) {
        ref.city.populationGroups.splice(idx, 1);
        this.save();
        return true;
      }
      return false;
    }
  }

  const store = new UniverseStore();

  // UI State
  const uiState = {
    selected: null, // { type: 'galaxy'|'system'|'body'|'city', id: string }
  };

  function selectEntity(sel) {
    uiState.selected = sel;
    renderTree();
    renderMain();
  }

  function renderTree() {
    const container = document.getElementById('tree');
    const frag = document.createDocumentFragment();

    const list = document.createElement('ul');
    list.style.paddingLeft = '0';
    list.style.borderLeft = 'none';

    for (const galaxy of store.state.galaxies) {
      const liGalaxy = document.createElement('li');

      const nodeGalaxy = document.createElement('div');
      nodeGalaxy.className = 'node';
      nodeGalaxy.dataset.type = 'galaxy';
      nodeGalaxy.dataset.id = galaxy.id;
      nodeGalaxy.innerHTML = `
        <span class="badge">Galáxia</span>
        <span class="title">${escapeHtml(galaxy.name)}</span>
        <span class="actions">
          <button class="icon-btn" data-action="add-system" title="Adicionar Sistema">+☼</button>
          <button class="icon-btn" data-action="edit" title="Editar">✎</button>
          <button class="icon-btn" data-action="delete" title="Excluir">🗑</button>
        </span>
      `;
      liGalaxy.appendChild(nodeGalaxy);

      if (galaxy.starSystems.length > 0) {
        const ulSystems = document.createElement('ul');
        for (const system of galaxy.starSystems) {
          const liSystem = document.createElement('li');
          const nodeSystem = document.createElement('div');
          nodeSystem.className = 'node';
          nodeSystem.dataset.type = 'system';
          nodeSystem.dataset.id = system.id;
          nodeSystem.innerHTML = `
            <span class="badge">Sistema</span>
            <span class="title">${escapeHtml(system.name)}</span>
            <span class="actions">
              <button class="icon-btn" data-action="add-body" title="Adicionar Corpo Celeste">+◎</button>
              <button class="icon-btn" data-action="edit" title="Editar">✎</button>
              <button class="icon-btn" data-action="delete" title="Excluir">🗑</button>
            </span>
          `;
          liSystem.appendChild(nodeSystem);

          if (system.bodies.length > 0) {
            const ulBodies = document.createElement('ul');
            for (const body of system.bodies) {
              const liBody = document.createElement('li');
              const nodeBody = document.createElement('div');
              nodeBody.className = 'node';
              nodeBody.dataset.type = 'body';
              nodeBody.dataset.id = body.id;
              const typeLabel = body.type === 'planeta' ? 'Planeta' : body.type === 'lua' ? 'Lua' : 'Asteróide';
              nodeBody.innerHTML = `
                <span class="badge">${typeLabel}</span>
                <span class="title">${escapeHtml(body.name)}</span>
                <span class="actions">
                  <button class="icon-btn" data-action="add-city" title="Adicionar Cidade">+🏙</button>
                  <button class="icon-btn" data-action="edit" title="Editar">✎</button>
                  <button class="icon-btn" data-action="delete" title="Excluir">🗑</button>
                </span>
              `;
              liBody.appendChild(nodeBody);

              if (body.cities.length > 0) {
                const ulCities = document.createElement('ul');
                for (const city of body.cities) {
                  const liCity = document.createElement('li');
                  const nodeCity = document.createElement('div');
                  nodeCity.className = 'node';
                  nodeCity.dataset.type = 'city';
                  nodeCity.dataset.id = city.id;
                  const totalPop = city.populationGroups.reduce((s, g) => s + (Number(g.count) || 0), 0);
                  nodeCity.innerHTML = `
                    <span class="badge">Cidade</span>
                    <span class="title">${escapeHtml(city.name)}</span>
                    <span class="badge">pop ${totalPop}</span>
                    <span class="actions">
                      <button class="icon-btn" data-action="edit" title="Editar">✎</button>
                      <button class="icon-btn" data-action="delete" title="Excluir">🗑</button>
                    </span>
                  `;
                  liCity.appendChild(nodeCity);
                  ulCities.appendChild(liCity);
                }
                liBody.appendChild(ulCities);
              }
              ulBodies.appendChild(liBody);
            }
            liSystem.appendChild(ulBodies);
          }
          ulSystems.appendChild(liSystem);
        }
        liGalaxy.appendChild(ulSystems);
      }

      list.appendChild(liGalaxy);
    }

    frag.appendChild(list);
    container.innerHTML = '';
    container.appendChild(frag);

    container.onclick = (ev) => {
      const node = ev.target.closest('.node');
      const actionBtn = ev.target.closest('[data-action]');
      if (!node && !actionBtn) return;
      if (actionBtn) {
        const type = node?.dataset.type;
        const id = node?.dataset.id;
        const action = actionBtn.dataset.action;
        if (!type || !id) return;
        handleTreeAction(type, id, action);
        ev.stopPropagation();
        return;
      }
      if (node) {
        selectEntity({ type: node.dataset.type, id: node.dataset.id });
      }
    };
  }

  function handleTreeAction(type, id, action) {
    if (action === 'edit') {
      openEditModal(type, id);
      return;
    }
    if (action === 'delete') {
      const label = type === 'galaxy' ? 'galáxia' : type === 'system' ? 'sistema estelar' : type === 'body' ? 'corpo celeste' : 'cidade';
      if (!confirm(`Tem certeza que deseja excluir esta ${label}? Esta ação é irreversível.`)) return;
      let parentSel = null;
      if (type === 'galaxy') {
        store.deleteGalaxy(id);
      } else if (type === 'system') {
        const ref = store.getSystemAndGalaxy(id);
        parentSel = ref ? { type: 'galaxy', id: ref.galaxy.id } : null;
        store.deleteStarSystem(id);
      } else if (type === 'body') {
        const ref = store.getBodyAndSystem(id);
        parentSel = ref ? { type: 'system', id: ref.system.id } : null;
        store.deleteBody(id);
      } else if (type === 'city') {
        const ref = store.getCityAndBody(id);
        parentSel = ref ? { type: 'body', id: ref.body.id } : null;
        store.deleteCity(id);
      }
      renderTree();
      if (parentSel) selectEntity(parentSel); else renderMain();
      showToast('Excluído com sucesso');
      return;
    }
    if (action === 'add-system' && type === 'galaxy') {
      openCreateModal('system', { galaxyId: id });
      return;
    }
    if (action === 'add-body' && type === 'system') {
      openCreateModal('body', { systemId: id });
      return;
    }
    if (action === 'add-city' && type === 'body') {
      openCreateModal('city', { bodyId: id });
      return;
    }
  }

  function renderMain() {
    const root = document.getElementById('content');
    const sel = uiState.selected;
    if (!sel) {
      root.querySelector('.welcome')?.classList.remove('hidden');
      root.innerHTML = document.querySelector('.welcome') ? root.innerHTML : root.innerHTML;
      return;
    }
    const container = document.createElement('div');

    if (sel.type === 'galaxy') {
      container.appendChild(renderGalaxyDetails(sel.id));
    } else if (sel.type === 'system') {
      container.appendChild(renderSystemDetails(sel.id));
    } else if (sel.type === 'body') {
      container.appendChild(renderBodyDetails(sel.id));
    } else if (sel.type === 'city') {
      container.appendChild(renderCityDetails(sel.id));
    }

    root.innerHTML = '';
    root.appendChild(container);
  }

  function renderGalaxyDetails(galaxyId) {
    const galaxy = store.getGalaxy(galaxyId);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="section-header">
        <h3>Galáxia: ${escapeHtml(galaxy.name)}</h3>
        <div class="section-actions">
          <button class="btn secondary" data-action="edit-galaxy">Editar</button>
          <button class="btn danger" data-action="delete-galaxy">Excluir</button>
        </div>
      </div>
      <div class="kv">
        <div class="key">Descrição</div>
        <div>${galaxy.description ? escapeHtml(galaxy.description) : '<span class="muted">—</span>'}</div>
        <div class="key">Sistemas</div>
        <div>${galaxy.starSystems.length}</div>
      </div>
    `;

    card.querySelector('[data-action="edit-galaxy"]').onclick = () => openEditModal('galaxy', galaxyId);
    card.querySelector('[data-action="delete-galaxy"]').onclick = () => handleTreeAction('galaxy', galaxyId, 'delete');

    const list = document.createElement('div');
    list.className = 'card';
    list.innerHTML = `
      <div class="section-header">
        <h4>Sistemas Estelares</h4>
        <button class="btn primary" data-action="add-system">+ Sistema</button>
      </div>
      ${galaxy.starSystems.length === 0 ? '<p class="muted">Nenhum sistema. Adicione o primeiro.</p>' : ''}
    `;

    list.querySelector('[data-action="add-system"]').onclick = () => openCreateModal('system', { galaxyId });

    if (galaxy.starSystems.length > 0) {
      const table = document.createElement('table');
      table.className = 'table';
      table.innerHTML = `
        <thead><tr><th>Nome</th><th>Corpos Celestes</th><th></th></tr></thead>
        <tbody></tbody>
      `;
      const tb = table.querySelector('tbody');
      for (const system of galaxy.starSystems) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><a href="#" data-link="system" data-id="${system.id}">${escapeHtml(system.name)}</a></td>
          <td>${system.bodies.length}</td>
          <td class="row-actions">
            <button class="icon-btn" title="Abrir" data-link="system" data-id="${system.id}">⤴</button>
            <button class="icon-btn" title="Editar" data-action="edit-system" data-id="${system.id}">✎</button>
            <button class="icon-btn" title="Excluir" data-action="delete-system" data-id="${system.id}">🗑</button>
          </td>
        `;
        tb.appendChild(tr);
      }
      list.appendChild(table);

      list.onclick = (ev) => {
        const link = ev.target.closest('[data-link]');
        const btn = ev.target.closest('[data-action]');
        if (link) {
          const type = link.dataset.link;
          const id = link.dataset.id;
          selectEntity({ type, id });
          ev.preventDefault();
        } else if (btn) {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          if (action === 'edit-system') openEditModal('system', id);
          if (action === 'delete-system') handleTreeAction('system', id, 'delete');
        }
      };
    }

    const container = document.createElement('div');
    container.appendChild(card);
    container.appendChild(list);
    return container;
  }

  function renderSystemDetails(systemId) {
    const ref = store.getSystemAndGalaxy(systemId);
    const system = ref.system;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="section-header">
        <h3>Sistema Estelar: ${escapeHtml(system.name)}</h3>
        <div class="section-actions">
          <button class="btn secondary" data-action="edit-system">Editar</button>
          <button class="btn danger" data-action="delete-system">Excluir</button>
        </div>
      </div>
      <div class="kv">
        <div class="key">Galáxia</div>
        <div><a href="#" data-link="galaxy" data-id="${ref.galaxy.id}">${escapeHtml(ref.galaxy.name)}</a></div>
        <div class="key">Descrição</div>
        <div>${system.description ? escapeHtml(system.description) : '<span class="muted">—</span>'}</div>
        <div class="key">Corpos Celestes</div>
        <div>${system.bodies.length}</div>
      </div>
    `;
    card.querySelector('[data-action="edit-system"]').onclick = () => openEditModal('system', systemId);
    card.querySelector('[data-action="delete-system"]').onclick = () => handleTreeAction('system', systemId, 'delete');
    card.onclick = (ev) => {
      const link = ev.target.closest('[data-link]');
      if (link) {
        selectEntity({ type: link.dataset.link, id: link.dataset.id });
        ev.preventDefault();
      }
    };

    const list = document.createElement('div');
    list.className = 'card';
    list.innerHTML = `
      <div class="section-header">
        <h4>Corpos Celestes</h4>
        <button class="btn primary" data-action="add-body">+ Corpo</button>
      </div>
      ${system.bodies.length === 0 ? '<p class="muted">Nenhum corpo celeste. Adicione o primeiro.</p>' : ''}
    `;
    list.querySelector('[data-action="add-body"]').onclick = () => openCreateModal('body', { systemId });

    if (system.bodies.length > 0) {
      const table = document.createElement('table');
      table.className = 'table';
      table.innerHTML = `
        <thead><tr><th>Nome</th><th>Tipo</th><th>Cidades</th><th>População Total</th><th></th></tr></thead>
        <tbody></tbody>
      `;
      const tb = table.querySelector('tbody');
      for (const body of system.bodies) {
        const pop = store.getBodyPopulationBreakdown(body.id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><a href="#" data-link="body" data-id="${body.id}">${escapeHtml(body.name)}</a></td>
          <td><span class="badge-type">${body.type}</span></td>
          <td>${body.cities.length}</td>
          <td>${pop.total}</td>
          <td class="row-actions">
            <button class="icon-btn" title="Abrir" data-link="body" data-id="${body.id}">⤴</button>
            <button class="icon-btn" title="Editar" data-action="edit-body" data-id="${body.id}">✎</button>
            <button class="icon-btn" title="Excluir" data-action="delete-body" data-id="${body.id}">🗑</button>
          </td>
        `;
        tb.appendChild(tr);
      }
      list.appendChild(table);

      list.onclick = (ev) => {
        const link = ev.target.closest('[data-link]');
        const btn = ev.target.closest('[data-action]');
        if (link) {
          selectEntity({ type: link.dataset.link, id: link.dataset.id });
          ev.preventDefault();
        } else if (btn) {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          if (action === 'edit-body') openEditModal('body', id);
          if (action === 'delete-body') handleTreeAction('body', id, 'delete');
        }
      };
    }

    const container = document.createElement('div');
    container.appendChild(card);
    container.appendChild(list);
    return container;
  }

  function renderBodyDetails(bodyId) {
    const ref = store.getBodyAndSystem(bodyId);
    const body = ref.body;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="section-header">
        <h3>${body.type === 'planeta' ? 'Planeta' : body.type === 'lua' ? 'Lua' : 'Asteróide'}: ${escapeHtml(body.name)}</h3>
        <div class="section-actions">
          <button class="btn secondary" data-action="edit-body">Editar</button>
          <button class="btn danger" data-action="delete-body">Excluir</button>
        </div>
      </div>
      <div class="kv">
        <div class="key">Sistema</div>
        <div><a href="#" data-link="system" data-id="${ref.system.id}">${escapeHtml(ref.system.name)}</a></div>
        <div class="key">Descrição</div>
        <div>${body.description ? escapeHtml(body.description) : '<span class="muted">—</span>'}</div>
        <div class="key">Cidades</div>
        <div>${body.cities.length}</div>
      </div>
    `;
    card.querySelector('[data-action="edit-body"]').onclick = () => openEditModal('body', bodyId);
    card.querySelector('[data-action="delete-body"]').onclick = () => handleTreeAction('body', bodyId, 'delete');
    card.onclick = (ev) => {
      const link = ev.target.closest('[data-link]');
      if (link) {
        selectEntity({ type: link.dataset.link, id: link.dataset.id });
        ev.preventDefault();
      }
    };

    const citiesCard = document.createElement('div');
    citiesCard.className = 'card';
    citiesCard.innerHTML = `
      <div class="section-header">
        <h4>Cidades</h4>
        <button class="btn primary" data-action="add-city">+ Cidade</button>
      </div>
      ${body.cities.length === 0 ? '<p class="muted">Nenhuma cidade. Adicione a primeira.</p>' : ''}
    `;
    citiesCard.querySelector('[data-action="add-city"]').onclick = () => openCreateModal('city', { bodyId });

    if (body.cities.length > 0) {
      const table = document.createElement('table');
      table.className = 'table';
      table.innerHTML = `
        <thead><tr><th>Nome</th><th>Personagens</th><th>Tipos de População</th><th>Total</th><th></th></tr></thead>
        <tbody></tbody>
      `;
      const tb = table.querySelector('tbody');
      for (const city of body.cities) {
        const total = store.getCityPopulationTotal(city.id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><a href="#" data-link="city" data-id="${city.id}">${escapeHtml(city.name)}</a></td>
          <td>${city.characters.length}</td>
          <td>${city.populationGroups.length}</td>
          <td>${total}</td>
          <td class="row-actions">
            <button class="icon-btn" title="Abrir" data-link="city" data-id="${city.id}">⤴</button>
            <button class="icon-btn" title="Editar" data-action="edit-city" data-id="${city.id}">✎</button>
            <button class="icon-btn" title="Excluir" data-action="delete-city" data-id="${city.id}">🗑</button>
          </td>
        `;
        tb.appendChild(tr);
      }
      citiesCard.appendChild(table);

      citiesCard.onclick = (ev) => {
        const link = ev.target.closest('[data-link]');
        const btn = ev.target.closest('[data-action]');
        if (link) {
          selectEntity({ type: link.dataset.link, id: link.dataset.id });
          ev.preventDefault();
        } else if (btn) {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          if (action === 'edit-city') openEditModal('city', id);
          if (action === 'delete-city') handleTreeAction('city', id, 'delete');
        }
      };
    }

    // Resumo de população (agregado do corpo)
    const pop = store.getBodyPopulationBreakdown(bodyId);
    const summary = document.createElement('div');
    summary.className = 'card';
    summary.innerHTML = `
      <div class="section-header">
        <h4>População Total do ${body.type === 'planeta' ? 'Planeta' : body.type === 'lua' ? 'Lua' : 'Asteróide'}</h4>
      </div>
      <div class="grid cols-2">
        <div>
          <canvas id="body-pop-chart" width="360" height="220" style="width: 100%; height: 220px;"></canvas>
        </div>
        <div>
          <div class="kv">
            <div class="key">Total</div>
            <div>${pop.total}</div>
          </div>
          <div class="legend" id="body-pop-legend"></div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.appendChild(card);
    container.appendChild(citiesCard);
    container.appendChild(summary);

    // Draw chart
    setTimeout(() => {
      const canvas = document.getElementById('body-pop-chart');
      const legend = document.getElementById('body-pop-legend');
      const items = [];
      for (const [typeName, count] of pop.byType.entries()) {
        items.push({ label: typeName, value: count, color: colorFromString(typeName) });
      }
      drawPieChart(canvas, items);
      legend.innerHTML = items.map(i => `<span class="item"><span class="swatch" style="background:${i.color}"></span>${escapeHtml(i.label)}: <strong>${i.value}</strong></span>`).join('');
    }, 0);

    return container;
  }

  function renderCityDetails(cityId) {
    const ref = store.getCityAndBody(cityId);
    const city = ref.city;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="section-header">
        <h3>Cidade: ${escapeHtml(city.name)}</h3>
        <div class="section-actions">
          <button class="btn secondary" data-action="edit-city">Editar</button>
          <button class="btn danger" data-action="delete-city">Excluir</button>
        </div>
      </div>
      <div class="kv">
        <div class="key">Corpo Celeste</div>
        <div><a href="#" data-link="body" data-id="${ref.body.id}">${escapeHtml(ref.body.name)} <span class="badge-type">${ref.body.type}</span></a></div>
        <div class="key">Descrição</div>
        <div>${city.description ? escapeHtml(city.description) : '<span class="muted">—</span>'}</div>
        <div class="key">Personagens</div>
        <div>${city.characters.length}</div>
        <div class="key">População Total</div>
        <div>${store.getCityPopulationTotal(cityId)}</div>
      </div>
    `;
    card.querySelector('[data-action="edit-city"]').onclick = () => openEditModal('city', cityId);
    card.querySelector('[data-action="delete-city"]').onclick = () => handleTreeAction('city', cityId, 'delete');
    card.onclick = (ev) => {
      const link = ev.target.closest('[data-link]');
      if (link) {
        selectEntity({ type: link.dataset.link, id: link.dataset.id });
        ev.preventDefault();
      }
    };

    // Personagens
    const chars = document.createElement('div');
    chars.className = 'card';
    chars.innerHTML = `
      <div class="section-header">
        <h4>Personagens</h4>
        <button class="btn primary" data-action="add-character">+ Personagem</button>
      </div>
      ${city.characters.length === 0 ? '<p class="muted">Nenhum personagem. Adicione o primeiro.</p>' : ''}
    `;

    chars.querySelector('[data-action="add-character"]').onclick = () => openCreateModal('character', { cityId });

    if (city.characters.length > 0) {
      const table = document.createElement('table');
      table.className = 'table';
      table.innerHTML = `
        <thead><tr><th>Nome</th><th>Espécie</th><th>Cargo/Função</th><th>Idade</th><th></th></tr></thead>
        <tbody></tbody>
      `;
      const tb = table.querySelector('tbody');
      for (const ch of city.characters) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(ch.name)}</td>
          <td>${escapeHtml(ch.species || '')}</td>
          <td>${escapeHtml(ch.role || '')}</td>
          <td>${ch.age ?? ''}</td>
          <td class="row-actions">
            <button class="icon-btn" title="Transferir" data-action="transfer-character" data-id="${ch.id}">⇄</button>
            <button class="icon-btn" title="Editar" data-action="edit-character" data-id="${ch.id}">✎</button>
            <button class="icon-btn" title="Excluir" data-action="delete-character" data-id="${ch.id}">🗑</button>
          </td>
        `;
        tb.appendChild(tr);
      }
      chars.appendChild(table);

      chars.onclick = (ev) => {
        const btn = ev.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'edit-character') openEditModal('character', id, { cityId });
        if (action === 'delete-character') {
          if (confirm('Excluir personagem?')) {
            store.deleteCharacter(cityId, id);
            renderTree();
            selectEntity({ type: 'city', id: cityId });
            showToast('Personagem excluído');
          }
        }
        if (action === 'transfer-character') openTransferModal(cityId, id);
      };
    }

    // População
    const pop = document.createElement('div');
    pop.className = 'card';
    pop.innerHTML = `
      <div class="section-header">
        <h4>Populações</h4>
        <button class="btn primary" data-action="add-pop">+ Tipo de População</button>
      </div>
      ${city.populationGroups.length === 0 ? '<p class="muted">Nenhum tipo de população. Adicione o primeiro.</p>' : ''}
      <div class="grid cols-2">
        <div>
          <canvas id="city-pop-chart" width="360" height="260" style="width: 100%; height: 260px;"></canvas>
        </div>
        <div>
          <div class="kv">
            <div class="key">Total</div>
            <div id="city-pop-total"></div>
          </div>
          <div class="legend" id="city-pop-legend"></div>
        </div>
      </div>
    `;

    pop.querySelector('[data-action="add-pop"]').onclick = () => openCreateModal('population', { cityId });

    if (city.populationGroups.length > 0) {
      const table = document.createElement('table');
      table.className = 'table';
      table.innerHTML = `
        <thead><tr><th>Tipo</th><th>Quantidade</th><th></th></tr></thead>
        <tbody></tbody>
      `;
      const tb = table.querySelector('tbody');
      for (const grp of city.populationGroups) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(grp.typeName)}</td>
          <td>${grp.count}</td>
          <td class="row-actions">
            <button class="icon-btn" title="Editar" data-action="edit-pop" data-id="${grp.id}">✎</button>
            <button class="icon-btn" title="Excluir" data-action="delete-pop" data-id="${grp.id}">🗑</button>
          </td>
        `;
        tb.appendChild(tr);
      }
      pop.appendChild(table);

      pop.onclick = (ev) => {
        const btn = ev.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'edit-pop') openEditModal('population', id, { cityId });
        if (action === 'delete-pop') {
          if (confirm('Excluir tipo de população?')) {
            store.deletePopulationGroup(cityId, id);
            renderTree();
            selectEntity({ type: 'city', id: cityId });
            showToast('Tipo de população excluído');
          }
        }
      };
    }

    const container = document.createElement('div');
    container.appendChild(card);
    container.appendChild(chars);
    container.appendChild(pop);

    // Draw chart for city
    setTimeout(() => {
      const canvas = document.getElementById('city-pop-chart');
      const legend = document.getElementById('city-pop-legend');
      const totalEl = document.getElementById('city-pop-total');
      const items = city.populationGroups.map(g => ({ label: g.typeName, value: g.count, color: colorFromString(g.typeName) }));
      drawPieChart(canvas, items);
      legend.innerHTML = items.map(i => `<span class="item"><span class="swatch" style="background:${i.color}"></span>${escapeHtml(i.label)}: <strong>${i.value}</strong></span>`).join('');
      totalEl.textContent = String(items.reduce((s,i) => s + (Number(i.value) || 0), 0));
    }, 0);

    return container;
  }

  // Modals
  function openModal(title, bodyHTML, footerButtons) {
    const overlay = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');
    document.getElementById('modal-title').textContent = title;
    body.innerHTML = bodyHTML;
    footer.innerHTML = '';
    for (const btn of footerButtons) footer.appendChild(btn);
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');

    const close = document.getElementById('modal-close');
    close.onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function inputEl(type, id, label, value = '', opts = {}) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <label for="${id}">${label}</label>
      ${type === 'textarea' ? `<textarea id="${id}" placeholder="${opts.placeholder || ''}">${value || ''}</textarea>` : type === 'select' ? `<select id="${id}">${(opts.options || []).map(o => `<option value="${o.value}" ${o.value===value?'selected':''}>${o.label}</option>`).join('')}</select>` : `<input id="${id}" type="${type}" value="${value || ''}" placeholder="${opts.placeholder || ''}">`}
    `;
    return wrap;
  }

  function openCreateModal(entityType, context = {}) {
    if (entityType === 'system') {
      const nameId = generateId('in');
      const descId = generateId('in');
      const body = document.createElement('div');
      body.appendChild(inputEl('text', nameId, 'Nome do Sistema', ''));
      body.appendChild(inputEl('textarea', descId, 'Descrição', ''));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Criar Sistema', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        const name = document.getElementById(nameId).value;
        const description = document.getElementById(descId).value;
        const sys = store.addStarSystem(context.galaxyId, { name, description });
        closeModal();
        renderTree();
        selectEntity({ type: 'system', id: sys.id });
        showToast('Sistema criado');
      };
      openModal('Novo Sistema Estelar', body.innerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'body') {
      const nameId = generateId('in');
      const typeId = generateId('in');
      const descId = generateId('in');
      const body = document.createElement('div');
      body.appendChild(inputEl('select', typeId, 'Tipo', 'planeta', { options: [
        { value: 'planeta', label: 'Planeta' },
        { value: 'lua', label: 'Lua' },
        { value: 'asteroide', label: 'Asteróide' },
      ] }));
      body.appendChild(inputEl('text', nameId, 'Nome do Corpo Celeste', ''));
      body.appendChild(inputEl('textarea', descId, 'Descrição', ''));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Criar Corpo', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        const type = document.getElementById(typeId).value;
        const name = document.getElementById(nameId).value;
        const description = document.getElementById(descId).value;
        const bod = store.addBody(context.systemId, { type, name, description });
        closeModal();
        renderTree();
        selectEntity({ type: 'body', id: bod.id });
        showToast('Corpo celeste criado');
      };
      openModal('Novo Corpo Celeste', body.innerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'city') {
      const nameId = generateId('in');
      const descId = generateId('in');
      const body = document.createElement('div');
      body.appendChild(inputEl('text', nameId, 'Nome da Cidade', ''));
      body.appendChild(inputEl('textarea', descId, 'Descrição', ''));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Criar Cidade', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        const name = document.getElementById(nameId).value;
        const description = document.getElementById(descId).value;
        const city = store.addCity(context.bodyId, { name, description });
        closeModal();
        renderTree();
        selectEntity({ type: 'city', id: city.id });
        showToast('Cidade criada');
      };
      openModal('Nova Cidade', body.innerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'character') {
      const nameId = generateId('in');
      const speciesId = generateId('in');
      const roleId = generateId('in');
      const ageId = generateId('in');
      const notesId = generateId('in');
      const body = document.createElement('div');
      body.className = 'grid cols-2';
      body.appendChild(inputEl('text', nameId, 'Nome', ''));
      body.appendChild(inputEl('text', speciesId, 'Espécie', ''));
      body.appendChild(inputEl('text', roleId, 'Cargo/Função', ''));
      body.appendChild(inputEl('number', ageId, 'Idade', ''));
      const notesWrap = inputEl('textarea', notesId, 'Notas', '');
      notesWrap.style.gridColumn = '1 / span 2';
      body.appendChild(notesWrap);
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Criar Personagem', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        const payload = {
          name: document.getElementById(nameId).value,
          species: document.getElementById(speciesId).value,
          role: document.getElementById(roleId).value,
          age: document.getElementById(ageId).value,
          notes: document.getElementById(notesId).value,
        };
        const ch = store.addCharacter(context.cityId, payload);
        closeModal();
        renderTree();
        selectEntity({ type: 'city', id: context.cityId });
        showToast('Personagem criado');
      };
      openModal('Novo Personagem', body.outerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'population') {
      const typeId = generateId('in');
      const countId = generateId('in');
      const body = document.createElement('div');
      body.className = 'grid cols-2';
      body.appendChild(inputEl('text', typeId, 'Tipo de População', 'Humanos'));
      body.appendChild(inputEl('number', countId, 'Quantidade', '1000'));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Adicionar', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        const typeName = document.getElementById(typeId).value;
        const count = document.getElementById(countId).value;
        store.addPopulationGroup(context.cityId, { typeName, count });
        closeModal();
        renderTree();
        selectEntity({ type: 'city', id: context.cityId });
        showToast('Tipo de população adicionado');
      };
      openModal('Adicionar Tipo de População', body.outerHTML, [btnCancel, btnSave]);
      return;
    }
  }

  function openEditModal(entityType, id, context = {}) {
    if (entityType === 'galaxy') {
      const g = store.getGalaxy(id);
      const nameId = generateId('in');
      const descId = generateId('in');
      const body = document.createElement('div');
      body.appendChild(inputEl('text', nameId, 'Nome da Galáxia', g.name));
      body.appendChild(inputEl('textarea', descId, 'Descrição', g.description));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Salvar', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        store.updateGalaxy(id, { name: document.getElementById(nameId).value, description: document.getElementById(descId).value });
        closeModal();
        renderTree();
        selectEntity({ type: 'galaxy', id });
        showToast('Galáxia atualizada');
      };
      openModal('Editar Galáxia', body.innerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'system') {
      const ref = store.getSystemAndGalaxy(id);
      const s = ref.system;
      const nameId = generateId('in');
      const descId = generateId('in');
      const body = document.createElement('div');
      body.appendChild(inputEl('text', nameId, 'Nome do Sistema', s.name));
      body.appendChild(inputEl('textarea', descId, 'Descrição', s.description));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Salvar', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        store.updateStarSystem(id, { name: document.getElementById(nameId).value, description: document.getElementById(descId).value });
        closeModal();
        renderTree();
        selectEntity({ type: 'system', id });
        showToast('Sistema atualizado');
      };
      openModal('Editar Sistema Estelar', body.innerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'body') {
      const ref = store.getBodyAndSystem(id);
      const b = ref.body;
      const nameId = generateId('in');
      const typeId = generateId('in');
      const descId = generateId('in');
      const body = document.createElement('div');
      body.appendChild(inputEl('select', typeId, 'Tipo', b.type, { options: [
        { value: 'planeta', label: 'Planeta' },
        { value: 'lua', label: 'Lua' },
        { value: 'asteroide', label: 'Asteróide' },
      ] }));
      body.appendChild(inputEl('text', nameId, 'Nome do Corpo Celeste', b.name));
      body.appendChild(inputEl('textarea', descId, 'Descrição', b.description));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Salvar', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        store.updateBody(id, {
          type: document.getElementById(typeId).value,
          name: document.getElementById(nameId).value,
          description: document.getElementById(descId).value
        });
        closeModal();
        renderTree();
        selectEntity({ type: 'body', id });
        showToast('Corpo celeste atualizado');
      };
      openModal('Editar Corpo Celeste', body.outerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'city') {
      const ref = store.getCityAndBody(id);
      const c = ref.city;
      const nameId = generateId('in');
      const descId = generateId('in');
      const body = document.createElement('div');
      body.appendChild(inputEl('text', nameId, 'Nome da Cidade', c.name));
      body.appendChild(inputEl('textarea', descId, 'Descrição', c.description));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Salvar', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        store.updateCity(id, { name: document.getElementById(nameId).value, description: document.getElementById(descId).value });
        closeModal();
        renderTree();
        selectEntity({ type: 'city', id });
        showToast('Cidade atualizada');
      };
      openModal('Editar Cidade', body.innerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'character') {
      const cityId = context.cityId || (store.state.galaxies.find(g => g.starSystems.some(s => s.bodies.some(b => b.cities.some(c => c.characters.some(ch => ch.id === id))))) && null);
      const refAll = store.getCityAndBody(context.cityId);
      const c = refAll.city.characters.find(ch => ch.id === id);
      const nameId = generateId('in');
      const speciesId = generateId('in');
      const roleId = generateId('in');
      const ageId = generateId('in');
      const notesId = generateId('in');
      const body = document.createElement('div');
      body.className = 'grid cols-2';
      body.appendChild(inputEl('text', nameId, 'Nome', c.name));
      body.appendChild(inputEl('text', speciesId, 'Espécie', c.species));
      body.appendChild(inputEl('text', roleId, 'Cargo/Função', c.role));
      body.appendChild(inputEl('number', ageId, 'Idade', c.age ?? ''));
      const notesWrap = inputEl('textarea', notesId, 'Notas', c.notes);
      notesWrap.style.gridColumn = '1 / span 2';
      body.appendChild(notesWrap);
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Salvar', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        const payload = {
          name: document.getElementById(nameId).value,
          species: document.getElementById(speciesId).value,
          role: document.getElementById(roleId).value,
          age: document.getElementById(ageId).value,
          notes: document.getElementById(notesId).value,
        };
        store.updateCharacter(context.cityId, id, payload);
        closeModal();
        renderTree();
        selectEntity({ type: 'city', id: context.cityId });
        showToast('Personagem atualizado');
      };
      openModal('Editar Personagem', body.outerHTML, [btnCancel, btnSave]);
      return;
    }
    if (entityType === 'population') {
      const ref = store.getCityAndBody(context.cityId);
      const g = ref.city.populationGroups.find(it => it.id === id);
      const typeId = generateId('in');
      const countId = generateId('in');
      const body = document.createElement('div');
      body.className = 'grid cols-2';
      body.appendChild(inputEl('text', typeId, 'Tipo de População', g.typeName));
      body.appendChild(inputEl('number', countId, 'Quantidade', g.count));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Salvar', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        store.updatePopulationGroup(context.cityId, id, { typeName: document.getElementById(typeId).value, count: document.getElementById(countId).value });
        closeModal();
        renderTree();
        selectEntity({ type: 'city', id: context.cityId });
        showToast('Tipo de população atualizado');
      };
      openModal('Editar Tipo de População', body.outerHTML, [btnCancel, btnSave]);
      return;
    }
  }

  function openTransferModal(fromCityId, characterId) {
    // Build selects for galaxy -> system -> body -> city
    const state = deepClone(store.state);

    const galaxyId = generateId('in');
    const systemId = generateId('in');
    const bodyId = generateId('in');
    const cityId = generateId('in');
    const newCityId = generateId('in');

    const body = document.createElement('div');
    body.className = 'grid cols-2';

    body.appendChild(inputEl('select', galaxyId, 'Galáxia', '', { options: state.galaxies.map(g => ({ value: g.id, label: g.name })) }));
    body.appendChild(inputEl('select', systemId, 'Sistema Estelar', '', { options: [] }));
    body.appendChild(inputEl('select', bodyId, 'Corpo Celeste', '', { options: [] }));
    body.appendChild(inputEl('select', cityId, 'Cidade', '', { options: [] }));

    const newCityWrap = inputEl('text', newCityId, 'Criar nova cidade (opcional)', '');
    newCityWrap.style.gridColumn = '1 / span 2';
    body.appendChild(newCityWrap);

    const btnCancel = button('Cancelar', '');
    const btnGo = button('Transferir', 'primary');

    btnCancel.onclick = closeModal;

    function syncSystems() {
      const gId = document.getElementById(galaxyId).value;
      const g = state.galaxies.find(x => x.id === gId);
      const sysSel = document.getElementById(systemId);
      sysSel.innerHTML = g ? g.starSystems.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('') : '';
      syncBodies();
    }
    function syncBodies() {
      const gId = document.getElementById(galaxyId).value;
      const sId = document.getElementById(systemId).value;
      const g = state.galaxies.find(x => x.id === gId);
      const s = g?.starSystems.find(y => y.id === sId);
      const bodSel = document.getElementById(bodyId);
      bodSel.innerHTML = s ? s.bodies.map(b => `<option value="${b.id}">${escapeHtml(b.name)} (${b.type})</option>`).join('') : '';
      syncCities();
    }
    function syncCities() {
      const gId = document.getElementById(galaxyId).value;
      const sId = document.getElementById(systemId).value;
      const bId = document.getElementById(bodyId).value;
      const g = state.galaxies.find(x => x.id === gId);
      const s = g?.starSystems.find(y => y.id === sId);
      const b = s?.bodies.find(z => z.id === bId);
      const citySel = document.getElementById(cityId);
      citySel.innerHTML = b ? b.cities.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') : '';
    }

    btnGo.onclick = () => {
      const gSel = document.getElementById(galaxyId).value;
      const sSel = document.getElementById(systemId).value;
      const bSel = document.getElementById(bodyId).value;
      let cSel = document.getElementById(cityId).value;
      const newCityName = document.getElementById(newCityId).value.trim();
      if (!gSel || !sSel || !bSel) {
        alert('Selecione destino completo (galáxia, sistema, corpo).');
        return;
      }
      if (!cSel && !newCityName) {
        alert('Selecione uma cidade de destino ou informe o nome para criar uma nova.');
        return;
      }
      if (newCityName) {
        const created = store.addCity(bSel, { name: newCityName, description: '' });
        cSel = created.id;
      }
      store.transferCharacter(fromCityId, cSel, characterId);
      closeModal();
      renderTree();
      selectEntity({ type: 'city', id: cSel });
      showToast('Personagem transferido');
    };

    openModal('Transferir Personagem', body.outerHTML, [btnCancel, btnGo]);

    // After appended to DOM, wire dependent selects
    setTimeout(() => {
      const ref = store.getCityAndBody(fromCityId);
      const currentGalaxyId = ref.galaxy.id;
      const currentSystemId = ref.system.id;
      const currentBodyId = ref.body.id;

      const gSel = document.getElementById(galaxyId);
      gSel.value = currentGalaxyId;
      gSel.onchange = syncSystems;

      const sSel = document.getElementById(systemId);
      sSel.onchange = syncBodies;

      const bSel = document.getElementById(bodyId);
      bSel.onchange = syncCities;

      syncSystems();
      sSel.value = currentSystemId;
      syncBodies();
      bSel.value = currentBodyId;
      syncCities();
    }, 0);
  }

  function button(label, variant) {
    const btn = document.createElement('button');
    btn.className = `btn ${variant || ''}`.trim();
    btn.textContent = label;
    return btn;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Chart
  function drawPieChart(canvas, items) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || canvas.width;
    const cssHeight = canvas.clientHeight || canvas.height;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const total = items.reduce((s, it) => s + (Number(it.value) || 0), 0);
    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const radius = Math.min(cssWidth, cssHeight) * 0.42;

    // Draw background circle when empty
    if (total <= 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(154,167,204,0.15)';
      ctx.fill();
      return;
    }

    let start = -Math.PI / 2;
    for (const it of items) {
      const value = Number(it.value) || 0;
      const angle = (value / total) * Math.PI * 2;
      const end = start + angle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = it.color || '#888';
      ctx.fill();
      start = end;
    }

    // Donut cutout
    const inner = radius * 0.64;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Center label
    ctx.fillStyle = '#d6ddff';
    ctx.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), cx, cy);
  }

  function exportJSON() {
    const data = deepClone(store.state);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'universo-sci-fi.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!parsed || !Array.isArray(parsed.galaxies)) throw new Error('Formato inválido');
        store.state = parsed;
        store.save();
        renderTree();
        document.getElementById('content').innerHTML = document.getElementById('content').innerHTML; // no-op
        showToast('Importado com sucesso');
      } catch (e) {
        alert('Falha ao importar: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  function initHeaderButtons() {
    document.getElementById('btn-add-galaxy').onclick = () => {
      const nameId = generateId('in');
      const descId = generateId('in');
      const body = document.createElement('div');
      body.appendChild(inputEl('text', nameId, 'Nome da Galáxia', ''));
      body.appendChild(inputEl('textarea', descId, 'Descrição', ''));
      const btnCancel = button('Cancelar', '');
      const btnSave = button('Criar Galáxia', 'primary');
      btnCancel.onclick = closeModal;
      btnSave.onclick = () => {
        const name = document.getElementById(nameId).value;
        const description = document.getElementById(descId).value;
        const gal = store.addGalaxy({ name, description });
        closeModal();
        renderTree();
        selectEntity({ type: 'galaxy', id: gal.id });
        showToast('Galáxia criada');
      };
      openModal('Nova Galáxia', body.innerHTML, [btnCancel, btnSave]);
    };

    document.getElementById('btn-export').onclick = exportJSON;
    document.getElementById('input-import').onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) importJSON(f);
      e.target.value = '';
    };
  }

  function init() {
    initHeaderButtons();
    renderTree();
  }

  document.addEventListener('DOMContentLoaded', init);
})();