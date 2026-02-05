function $(sel){ return document.querySelector(sel); }

const CATEGORIES = [
	{ key: 'carpetas', label: 'Carpetas de producción' },
	{ key: 'apps', label: 'Apps' },
	{ key: 'mods', label: 'Mods (Minecraft)' },
	{ key: 'otros', label: 'Otros' }
];

// Template hierarchy requested by user
const TEMPLATE = {
	carpetas: {
		'Salva al mundo pero no le digas a nadie': [
			'Cover', 'Guion', 'Ficha técnica', 'Sinópsis', 'Logline', 'Comentarios de la Dirección', 'Lore', 'Diseño de personajes', 'Diseño de locaciones', 'Paletas de colores', 'Scouting de locaciones'
		],
		'Azul': [
			'Cover', 'Guion', 'Ficha técnica', 'Sinópsis', 'Logline', 'Comentarios de la Dirección', 'Lore', 'Diseño de personajes', 'Diseño de locaciones', 'Paletas de colores', 'Scouting de locaciones'
		]
	},
	apps: {
		'XP & initiative tracker': ['Resumen de la app', 'Features' , 'Links de descarga', 'Únete a la prueba alpha (Android)', 'Envíanos feedback']
	},
	mods: {
		'Microblocks': ['Sobre el mod', 'Instrucciones de instalación', 'Links de descarga']
	}
};

document.addEventListener('DOMContentLoaded', async ()=>{
	const gallery = $('#gallery');
	// Theme initialization
	const stored = localStorage.getItem('theme') || 'dark';
	if(stored === 'light') document.body.classList.add('theme-light');
	const themeToggle = $('#themeToggle');
	if(themeToggle){
		updateThemeButton();
		themeToggle.addEventListener('click', ()=>{
			const isLight = document.body.classList.toggle('theme-light');
			localStorage.setItem('theme', isLight ? 'light' : 'dark');
			updateThemeButton();
		});
	}
	const candidates = [
		'/api/downloads',
		'http://localhost:3000/api/downloads',
		'http://127.0.0.1:3000/api/downloads'
	];
	try{
		const files = await tryFetchAny(candidates);
		// If fetch succeeds we show a server banner; even if files is empty we'll render placeholders
		if(Array.isArray(files)){
			if(files.length > 0){
				document.querySelector('header').appendChild(Object.assign(document.createElement('div'), { className: 'server-banner', textContent: 'Archivos públicos desde el servidor' }));
			} else {
				document.querySelector('header').appendChild(Object.assign(document.createElement('div'), { className: 'server-banner', textContent: 'Servidor activo — sin archivos encontrados' }));
			}
		}
		const { tree, order } = buildHierarchy(Array.isArray(files) ? files : []);
		renderGallery(gallery, tree, order);
	}catch(err){
		// Fallback: no server reachable — render the template-only hierarchy so user can view structure
		const { tree, order } = buildHierarchy([]);
		renderGallery(gallery, tree, order);
		// Show hint to indicate offline/template mode
		const note = document.createElement('div');
		note.className = 'server-banner';
		note.textContent = 'Modo offline — mostrando plantilla (placeholders)';
		document.querySelector('header').appendChild(note);
	}
});

function updateThemeButton(){
	const btn = $('#themeToggle');
	if(!btn) return;
	const isLight = document.body.classList.contains('theme-light');
	btn.textContent = isLight ? '☀️ Luz' : '🌙 Oscuro';
}

async function tryFetchAny(urls){
	let lastErr = null;
	for(const url of urls){
		try{
			const res = await fetch(url, { cache: 'no-store' });
			if(!res.ok) throw new Error(`Bad response ${res.status}`);
			const data = await res.json();
			return data;
		}catch(err){
			lastErr = err;
			// continue to next
		}
	}
	throw lastErr || new Error('No endpoints available');
}

function buildHierarchy(files){
	const tree = {};
	const order = {};
	CATEGORIES.forEach(c => { tree[c.key] = {}; order[c.key] = []; });

	// initialize projects from template in declared order
	Object.keys(TEMPLATE).forEach(cat =>{
		const projects = TEMPLATE[cat];
		Object.keys(projects).forEach(p => {
			tree[cat][p] = [];
			order[cat].push(p);
		});
	});

	// map real files into tree, append unseen projects in encounter order
	files.forEach(f =>{
		const cat = getCategoryKey(f);
		const rel = (f.relPath || f.name || '').replace(/\\/g, '/');
		const parts = rel.split('/').filter(Boolean);
		const project = parts.length > 1 ? parts[0] : (parts[0] || 'General');
		if(!tree[cat][project]) tree[cat][project] = [];
		tree[cat][project].push(f);
		if(!order[cat].includes(project)) order[cat].push(project);
	});

	// For each template project, build ordered files according to TEMPLATE list
	Object.keys(TEMPLATE).forEach(cat =>{
		const projects = TEMPLATE[cat];
		Object.keys(projects).forEach(proj =>{
			if(!tree[cat][proj]) tree[cat][proj] = [];
			const existing = tree[cat][proj];
			const used = new Set();
			const ordered = [];
			// place items following template order, preferring real files that match label
			projects[proj].forEach(label =>{
				const slug = label.toLowerCase();
				const matchIndex = existing.findIndex((e,i)=> !used.has(i) && ((e.name||e.relPath||'').toLowerCase().includes(slug)));
				if(matchIndex >= 0){
					ordered.push(existing[matchIndex]);
					used.add(matchIndex);
				} else {
					ordered.push({ name: label, relPath: proj + '/' + label, size: 0, url: null, placeholder: true });
				}
			});
			// append any remaining real files that didn't match template labels
			existing.forEach((e,i)=>{
				if(!used.has(i)) ordered.push(e);
			});
			tree[cat][proj] = ordered;
		});
	});

	// Ensure any non-template projects are present in order
	Object.keys(tree).forEach(cat =>{
		Object.keys(tree[cat]).forEach(proj =>{
			if(!order[cat].includes(proj)) order[cat].push(proj);
		});
	});

	return { tree, order };
}

function getCategoryKey(file){
	const path = (file.relPath || file.name || '').toLowerCase();
	const name = (file.name || '').toLowerCase();
	const ext = name.split('.').pop() || '';
	const guionExt = ['txt','md','pdf','doc','docx','rtf'];
	const appsExt = ['apk','aab','ipa','exe','msi','zip','tar','gz'];
	const modsExt = ['jar','mcpack','mcaddon','zip'];
	if(guionExt.includes(ext) || path.includes('guion') || path.includes('script') || path.includes('scripts')) return 'carpetas';
	if(appsExt.includes(ext) || path.includes('app') || path.includes('apk') || path.includes('flutter') || path.includes('dart')) return 'apps';
	if(modsExt.includes(ext) || path.includes('mod') || path.includes('mods')) return 'mods';
	return 'otros';
}

function renderGallery(container, tree, order){
	container.innerHTML = '';
	const grid = document.createElement('div');
	grid.className = 'cards-grid-inner';
	CATEGORIES.forEach(cat =>{
		const card = document.createElement('div');
		card.className = 'card category-card';
		const details = document.createElement('details');
		const summary = document.createElement('summary');
		summary.textContent = cat.label;
		details.appendChild(summary);
		const content = document.createElement('div');
		content.className = 'category-content';
		const projects = tree[cat.key] || {};
		const projectNames = order && order[cat.key] ? order[cat.key] : Object.keys(projects).sort((a,b)=> a.localeCompare(b));
		if(!projectNames || projectNames.length === 0){
			content.appendChild(Object.assign(document.createElement('p'), { textContent: 'No hay elementos.' }));
		} else {
			projectNames.forEach(proj =>{
				const projDetails = document.createElement('details');
				projDetails.className = 'project';
				const projSummary = document.createElement('summary');
				projSummary.textContent = proj;
				projDetails.appendChild(projSummary);
				const fileList = document.createElement('div');
				fileList.className = 'file-list project-files';
				const files = projects[proj] || [];
				files.forEach(file =>{
					const fileDet = document.createElement('details');
					fileDet.className = 'file-item';
					const fileSum = document.createElement('summary');
					const filename = (file.name || file.relPath).split('/').pop();
					fileSum.textContent = filename;
					fileDet.appendChild(fileSum);
					const fileBody = document.createElement('div');
					fileBody.className = 'file-meta';
					// Special-case notes for certain template items
					const lname = (file.name || file.relPath || '').toLowerCase();
					const isGuion = lname.includes('guion');
					const isSinosis = lname.includes('sinópsis') || lname.includes('sinopsis');
					const isLogline = lname.includes('logline');
					const projKey = (proj || '').toString().toLowerCase();

					// XP & Initiative Tracker — contenido específico solicitado
					if(projKey.includes('xp') || projKey.includes('initiative')){
						if(lname.includes('resumen')){
							const note = document.createElement('div');
							note.className = 'placeholder-note';
							note.innerHTML = `App creada para poder manejar el combate de diversos TTRPGs como Dungeons and Dragons, Pathfinder o Daggerheart, así como para calcular la experiencia de dichos combates de manera automática.`;
							fileBody.appendChild(note);
						} else if(lname.includes('features')){
							const note = document.createElement('div');
							note.className = 'placeholder-note';
							note.innerHTML = `<ul style="margin:0 0 0 1.1rem;padding:0">
							<li>Soporte para español, frances, inglés, alemán, japonés, e italiano</li>
							<li>Soporte para hasta 4 campañas de Daggerheart, DnD, o Pathfinder 1 y 2</li>
							<li>Calculo de experiencia</li>
							<li>Base de datos de Monstruos</li>
							<li>Pantalla de DM</li>
							<li>Creación de hojas de personaje (Próximamente)</li>
							</ul>`;
							fileBody.appendChild(note);
						} else if(lname.includes('links')){
							const note = document.createElement('div');
							note.className = 'placeholder-note';
							note.innerHTML = `Webapp: <a href="https://xpinitracker.netlify.app/" target="_blank">https://xpinitracker.netlify.app/</a><br><em>para android la app sigue en pruebas alpha, mientras que para apple, la appstore nos permite tener la app todavía ni en pruebas</em>`;
							fileBody.appendChild(note);
						} else if(lname.includes('únete') || lname.includes('unete')){
							const note = document.createElement('div');
							note.className = 'placeholder-note';
							note.innerHTML = `Envía correo a <strong>miiina1527dev@gmail.com</strong> con el asunto "prueba alpha" o llena este forms <a href="https://forms.gle/c8Sh5GwTK9uhS11N8" target="_blank">https://forms.gle/c8Sh5GwTK9uhS11N8</a>`;
							fileBody.appendChild(note);
						} else if(lname.includes('envíanos') || lname.includes('envianos') || lname.includes('feedback')){
							const note = document.createElement('div');
							note.className = 'placeholder-note';
							note.innerHTML = `Feedback: <a href="https://forms.gle/6XeXp8Wq1QeYeXKp8" target="_blank">https://forms.gle/6XeXp8Wq1QeYeXKp8</a>`;
							fileBody.appendChild(note);
						} else if(file.url){
							const a = document.createElement('a');
							a.href = file.url;
							a.textContent = 'Abrir';
							a.target = '_blank';
							fileBody.appendChild(a);
						} else {
							const na = document.createElement('div');
							na.textContent = 'No hay archivo cargado para este ítem.';
							na.style.color = '#666';
							fileBody.appendChild(na);
						}
					} else {
						// Fallback/general handling for other projects
						if(isGuion || isSinosis){
							const note = document.createElement('div');
							note.className = 'placeholder-note';
							note.innerHTML = `En caso de interesarte la producción, por favor pide el guion y la sinopsis al correo <strong>frisuarez1701@gmail.com</strong>, junto con tu propuesta de producción.`;
							fileBody.appendChild(note);
						} else if(isLogline){
							const note = document.createElement('div');
							note.className = 'placeholder-note';
							// If current project is Azul, use the provided Azul logline; otherwise use default
							if((proj || '').toString().toLowerCase().includes('azul')){
								note.innerHTML = `Logline: <em>Una adolescente de 15 años navega el confuso despertar del primer amor en la preparatoria solo para descubrir que la persona por la que siente algo no es un chico, sino la novia de su mejor amigo. Al mismo tiempo, su padre soltero debe dejar ir el pasado para permitirse amar de nuevo y perseguir sus sueños, tanto profesionales como personales.</em>`;
							} else {
								note.innerHTML = `Logline: <em>Un joven nahua se convierte en el recipiente de un poder ancestral cuando descubre el secreto de la chica que le gusta, quien le regala unas piedras legadas por los mexicas como única defensa contra una raza de seres inmortales infiltrados en la humanidad, obligándolo a salvar el mundo antes de que esta gente lo destruya.</em>`;
							}
							fileBody.appendChild(note);
						} else if(file.url){
							const a = document.createElement('a');
							a.href = file.url;
							a.textContent = 'Abrir';
							a.target = '_blank';
							fileBody.appendChild(a);
						} else {
							const na = document.createElement('div');
							na.textContent = 'No hay archivo cargado para este ítem.';
							na.style.color = '#666';
							fileBody.appendChild(na);
						}
					}
					const size = document.createElement('div');
					size.className = 'meta-size';
					size.textContent = `Tamaño: ${formatBytes(file.size || 0)}`;
					fileBody.appendChild(size);
					fileDet.appendChild(fileBody);
					fileList.appendChild(fileDet);
				});
				projDetails.appendChild(fileList);
				content.appendChild(projDetails);
			});
		}
		details.appendChild(content);
		card.appendChild(details);
		grid.appendChild(card);
	});
	container.appendChild(grid);
}

function formatBytes(bytes){
	if(!bytes) return '0 B';
	const k = 1024, sizes = ['B','KB','MB','GB','TB'];
	const i = Math.floor(Math.log(bytes)/Math.log(k));
	return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i];
}

