/* ---
Proyecto 3i/atlas: Script Principal de la Aplicación
Versión: 2.3 (Auditoría de Ingeniería - FIX VISOR 3D)
Ingeniero: (Tu Nombre/Proyecto)
Foco: Corrección de visibilidad 3D, Implementación de OrbitControls.
--- */

document.addEventListener("DOMContentLoaded", () => {

    // --- CONSTANTES Y CONFIGURACIÓN ---
    const G_SHEET_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxabjy4eJxZoL1qSewLRfKqvI4tn0EopsEimZhAZydmh4OA8c9Ya1gR6IH1jHHouWvv/exec';

    // --- ESTADO DE LA APLICACIÓN (Ingeniería) ---
    let isLoggedIn = false;
    let trackerInitialized = false;
    let simulationInterval = null;
    
    // --- VARIABLES 3D (Declaradas aquí, inicializadas en startThreeJSScene) ---
    let scene, camera, renderer, starField;
    let nucleus, coma, tailParticles;
    let orbit;
    let sunLight;
    let clock;
    
    /* *** AUDITORÍA DE INGENIERO (NUEVA VARIABLE 3D) ***
      POR QUÉ: Para los controles de cámara.
      PARA QUÉ: Esta variable manejará la instancia de OrbitControls.
    */
    let controls; 

    // --- SELECTORES DEL DOM (Caché de elementos para performance) ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    // Selectores de Login/Sesión
    const showLoginLink = document.getElementById('show-login');
    const showRegisterLink = document.getElementById('show-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    
    // Selectores de botones de sesión (Escritorio)
    const loginButton = document.getElementById('login-button');
    const unirseButton = document.getElementById('unirse-button');
    const logoutButton = document.getElementById('logout-button');

    // Selectores del Rastreador
    const trackerMapContainer = document.getElementById('tracker-map');
    const simVelocity = document.getElementById('sim-velocity');
    const simDistance = document.getElementById('sim-distance');
    const simTime = document.getElementById('sim-time');
    const simStatus = document.getElementById('sim-status');
    const simVoyager = document.getElementById('sim-voyager');

    // Selector de Tema
    const themeToggleButton = document.getElementById('theme-toggle');

    // Selectores del Menú Móvil
    const menuToggleButton = document.getElementById('menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileLoginButton = document.getElementById('mobile-login-button');
    const mobileUnirseButton = document.getElementById('mobile-unirse-button');
    const mobileLogoutButton = document.getElementById('mobile-logout-button');


    // --- NÚCLEO DE LA APLICACIÓN (SPA) ---
    function navigateTo(pageId) {
        mobileNav.classList.remove('active');

        // --- LÓGICA DE SEGURIDAD (GATING) ---
        if (pageId === 'page-tracker' && !isLoggedIn) {
            console.warn("Acceso denegado. Se requiere inicio de sesión.");
            alert("Debes iniciar sesión para acceder al Rastreador.");
            pageId = 'page-login';
        }
        
        // 1. Oculta todas las páginas
        pages.forEach(page => page.classList.remove('active'));

        // 2. Muestra la página objetivo
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // 3. Scroll al inicio
        window.scrollTo(0, 0);

        // 4. Lógica específica de la página
        if (pageId === 'page-tracker') {
            if (!trackerInitialized) {
                initTrackerMap();
            }
            startSimulation();
        } else {
            stopSimulation();
        }

        // 5. Manejo de formularios de login
        if (pageId === 'page-login') {
            formRegister.classList.remove('active');
            formLogin.classList.add('active');
        }
    }

    // --- MÓDULO DE ANIMACIÓN (Intersection Observer) ---
    function initScrollAnimations() {
        const sections = document.querySelectorAll('.content-section');
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, options);

        sections.forEach(section => {
            observer.observe(section);
        });
    }

    // --- MÓDULO DE SESIÓN Y AUTENTICACIÓN ---
    function updateHeaderUI(loggedIn) {
        isLoggedIn = loggedIn;
        
        if (loggedIn) {
            // Escritorio
            loginButton.style.display = 'none';
            unirseButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
            // Móvil
            mobileLoginButton.style.display = 'none';
            mobileUnirseButton.style.display = 'none';
            mobileLogoutButton.style.display = 'inline-block';
        } else {
            // Escritorio
            loginButton.style.display = 'inline-block';
            unirseButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            // Móvil
            mobileLoginButton.style.display = 'inline-block';
            mobileUnirseButton.style.display = 'inline-block';
            mobileLogoutButton.style.display = 'none';
        }
    }

    function handleLogout() {
        updateHeaderUI(false);
        navigateTo('page-informacion');
        console.log("Sesión cerrada.");
    }

    async function handleRegister(e) {
        e.preventDefault();
        const submitButton = formRegister.querySelector('input[type="submit"]');
        submitButton.value = 'Procesando...';
        submitButton.disabled = true;

        const formData = new FormData();
        formData.append('action', 'register');
        formData.append('username', document.getElementById('reg-username').value);
        formData.append('email', document.getElementById('reg-email').value);
        formData.append('password', document.getElementById('reg-password').value);

        try {
            const response = await fetch(G_SHEET_APP_SCRIPT_URL, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.status === 'success') {
                console.log("Registro exitoso.");
                updateHeaderUI(true);
                navigateTo('page-tracker');
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error en fetch de registro:', error);
            alert('Error de conexión. No se pudo contactar al servidor.');
        } finally {
            submitButton.value = 'Crear y Unirse';
            submitButton.disabled = false;
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const submitButton = formLogin.querySelector('input[type="submit"]');
        submitButton.value = 'Verificando...';
        submitButton.disabled = true;

        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('username', document.getElementById('login-username').value);
        formData.append('password', document.getElementById('login-password').value);

        try {
            const response = await fetch(G_SHEET_APP_SCRIPT_URL, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.status === 'success') {
                console.log("Login exitoso.");
                updateHeaderUI(true);
                navigateTo('page-tracker');
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error en fetch de login:', error);
            alert('Error de conexión. No se pudo contactar al servidor.');
        } finally {
            submitButton.value = 'Ingresar al Rastreador';
            submitButton.disabled = false;
        }
    }

    // --- MÓDULO DE TEMA (Dark/Light) ---
    function initThemeToggle() {
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.add('light-theme');
        }
    }


    // --- MÓDULO DEL RASTREADOR (Three.js) ---

    function initTrackerMap() {
        // Doble chequeo de ingeniero: que 'THREE' exista (librería base)
        // y que 'THREE.OrbitControls' exista (el script de controles).
        if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined') {
            console.warn('Three.js o OrbitControls no están cargados. Reintentando...');
            
            // Si falta OrbitControls pero Three.js existe, solo carga OrbitControls
            if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls === 'undefined') {
                const controlsScript = document.createElement('script');
                controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
                document.head.appendChild(controlsScript);
                controlsScript.onload = startThreeJSScene;
                controlsScript.onerror = () => console.error('Error fatal: No se pudo cargar OrbitControls.');
            } else {
                // Si falta todo, carga todo (esto es un fallback de la carga del HTML)
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                document.head.appendChild(script);
                script.onload = () => {
                    const controlsScript = document.createElement('script');
                    controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
                    document.head.appendChild(controlsScript);
                    controlsScript.onload = startThreeJSScene;
                };
            }
        } else {
            startThreeJSScene();
        }
    }

    /**
     * Construye la escena 3D una vez que Three.js está listo.
     */
    function startThreeJSScene() {
        trackerInitialized = true;
        
        // 1. Escena
        scene = new THREE.Scene();
        clock = new THREE.Clock(); // Inicialización segura

        // 2. Cámara (¡Posición corregida!)
        camera = new THREE.PerspectiveCamera(75, trackerMapContainer.clientWidth / trackerMapContainer.clientHeight, 0.1, 1000);
        
        /* *** AUDITORÍA DE INGENIERO (FIX 3D v2.3) ***
          POR QUÉ: La cámara estaba muy cerca (z=15) y estática.
          PARA QUÉ: La movemos para atrás (z=40) para que tenga
          una buena vista inicial de la órbita.
        */
        camera.position.z = 40;
        camera.position.y = 10;

        // 3. Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(trackerMapContainer.clientWidth, trackerMapContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        trackerMapContainer.appendChild(renderer.domElement);

        /* *** AUDITORÍA DE INGENIERO (NUEVO VISOR 3D v2.3) ***
          POR QUÉ: Para que el visor sea interactivo.
          PARA QUÉ: Inicializamos los OrbitControls, vinculando la
          cámara con las acciones del mouse en el 'renderer'.
        */
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Efecto de "inercia" suave
        controls.dampingFactor = 0.05;
        controls.minDistance = 5; // Límite de zoom (para no meterse "adentro")
        controls.maxDistance = 100; // Límite de zoom (para no irse muy lejos)

        // 4. Luces (El "Sol")
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);
        sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
        sunLight.position.set(10, 5, 10);
        scene.add(sunLight);

        // 5. Creación del 3i/atlas (Núcleo, Coma, Cola)
        nucleus = createNucleus();
        coma = createComa();
        tailParticles = createTail();
        nucleus.add(coma);
        nucleus.add(tailParticles);
        scene.add(nucleus);

        // 6. Creación de la Órbita
        orbit = createOrbit();
        scene.add(orbit);

        // 7. Campo de Estrellas
        starField = createStarfield();
        scene.add(starField);

        // 8. Loop de Animación
        animateTracker();

        // 9. Responsive
        window.addEventListener('resize', onWindowResize);
    }

    /**
     * EXPERTO 3D: Crea el núcleo rocoso procedural.
     */
    function createNucleus() {
        const geometry = new THREE.IcosahedronGeometry(1, 5);
        const positionAttribute = geometry.getAttribute('position');
        const vertex = new THREE.Vector3();
        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            const noise = 0.2 + (Math.random() - 0.5) * 0.15;
            vertex.normalize().multiplyScalar(1 + noise);
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.1
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * EXPERTO 3D: Crea la coma (atmósfera de gas).
     */
    function createComa() {
        const geometry = new THREE.SphereGeometry(2.5, 32, 32); 
        const material = new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * EXPERTO 3D: Crea la cola del sistema de partículas.
     */
    function createTail() {
        const particleCount = 5000;
        const vertices = [];
        for (let i = 0; i < particleCount; i++) {
            const x = 0;
            const y = (Math.random() - 0.5) * 0.5;
            const z = (Math.random() - 1) * 10;
            vertices.push(x, y, z);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({
            color: 0x88ffff,
            size: 0.05,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        return new THREE.Points(geometry, material);
    }

    /**
     * EXPERTO 3D: Crea la línea de la órbita.
     */
    function createOrbit() {
        const curve = new THREE.EllipseCurve(
            0, 0,
            30, 20, // Radios de la elipse
            0, 2 * Math.PI,
            false, 0
        );
        const points = curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x007aff,
            opacity: 0.3,
            transparent: true
        });
        const orbitLine = new THREE.Line(geometry, material);
        orbitLine.rotation.x = THREE.MathUtils.degToRad(175); // Inclinación
        orbitLine.curve = curve;
        return orbitLine;
    }

    /**
     * EXPERTO 3D: Crea el campo de estrellas.
     */
    function createStarfield() {
        const starVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starVertices.push(x, y, z);
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const starMaterial = new THREE.PointsMaterial({ 
            color: 0xffffff,
            size: 0.1,
            transparent: true
        });
        return new THREE.Points(starGeometry, starMaterial);
    }

    /**
     * Loop de animación para el tracker (Actualizado v2.3)
     */
    function animateTracker() {
        if (!trackerInitialized) return;
        
        requestAnimationFrame(animateTracker);

        // Chequeo de seguridad robusto
        if (!clock || !nucleus || !orbit || !tailParticles || !controls) return;

        const elapsedTime = clock.getElapsedTime();

        // 1. Mover el núcleo en la órbita
        const orbitSpeed = elapsedTime * 0.1;
        const newPosition = orbit.curve.getPointAt(orbitSpeed % 1);
        nucleus.position.copy(newPosition).applyQuaternion(orbit.quaternion);

        // 2. Orientar el núcleo/cola lejos del "Sol"
        nucleus.lookAt(sunLight.position);
        
        // 3. Animar la cola de partículas (Streaming)
        const positions = tailParticles.geometry.getAttribute('position').array;
        const particleSpeed = 0.05;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] += particleSpeed; 
            positions[i] += (Math.random() - 0.5) * 0.01;
            positions[i+1] += (Math.random() - 0.5) * 0.01;
            if (positions[i + 2] > 0) {
                positions[i] = 0;
                positions[i + 1] = (Math.random() - 0.5) * 0.5;
                positions[i + 2] = (Math.random() - 1) * 5;
            }
        }
        tailParticles.geometry.attributes.position.needsUpdate = true;

        // 4. Rotación del núcleo y estrellas
        nucleus.rotation.y += 0.005;
        starField.rotation.y += 0.0001;

        /* *** AUDITORÍA DE INGENIERO (NUEVO RENDER v2.3) ***
          POR QUÉ: Por los OrbitControls.
          PARA QUÉ: 'controls.update()' aplica la inercia (damping)
          y recalcula la posición de la cámara si el usuario la movió.
          DEBE llamarse en cada frame ANTES de renderizar.
        */
        controls.update();

        // 5. Renderizar
        renderer.render(scene, camera);
    }

    /**
     * Maneja el re-dimensionamiento de la ventana para el canvas 3D
     */
    function onWindowResize() {
        if (!renderer || !camera) return;
        
        const w = trackerMapContainer.clientWidth;
        const h = trackerMapContainer.clientHeight;

        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }


    // --- MÓDULO DE SIMULACIÓN DE DATOS ---
    function startSimulation() {
        if (simulationInterval) return;
        console.log("Iniciando simulación de telemetría...");

        const voyagerMessages = ['...SEÑAL ESTABLE...', 'FLUCTUACIÓN DE PLASMA', 'AUMENTO RAYOS GAMMA', 'DATOS CORRUPTOS', 'RECALIBRANDO...', '...SEÑAL ESTABLE...'];
        const statusMessages = ['MONITOREANDO', 'ALERTA LEVE', 'ESTABLE'];

        simulationInterval = setInterval(() => {
            if (!simVelocity || !simDistance || !simTime) return;

            // 1. Velocidad (Random walk)
            let velocity = parseFloat(simVelocity.innerText);
            velocity += (Math.random() - 0.45) * 5;
            if (velocity < 150) velocity = 150;
            simVelocity.innerText = velocity.toFixed(2);

            // 2. Distancia (Basada en velocidad)
            let distance = parseFloat(simDistance.innerText);
            distance -= (velocity / 1000);
            if (distance < 0) distance = 100.0;
            simDistance.innerText = distance.toFixed(2);

            // 3. ETA (Tiempo de llegada)
            let timeToEarth = distance / (velocity / 100);
            simTime.innerText = `${timeToEarth.toFixed(1)}h`;

            // 4. Mensajes Aleatorios
            if (Math.random() < 0.2) {
                simVoyager.innerText = voyagerMessages[Math.floor(Math.random() * voyagerMessages.length)];
                simStatus.innerText = statusMessages[Math.floor(Math.random() * statusMessages.length)];
            }
            
            // Efecto "blink" en status
            if(simStatus.innerText !== 'ESTABLE') {
                simStatus.style.color = (Math.floor(Date.now() / 500) % 2) ? 'red' : 'var(--color-primary)';
            } else {
                simStatus.style.color = 'var(--color-primary)';
            }

        }, 1000);
    }

    function stopSimulation() {
        if (simulationInterval) {
            console.log("Deteniendo simulación.");
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
    }

    // --- MÓDULO DE MENÚ MÓVIL ---
    function initMobileMenu() {
        menuToggleButton.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
        });

        const mobileLinks = mobileNav.querySelectorAll('.nav-link');
        mobileLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = e.currentTarget.dataset.page;
                if (pageId) {
                    navigateTo(pageId);
                }
            });
        });
        mobileLogoutButton.addEventListener('click', handleLogout);
    }


    // --- INICIALIZACIÓN DE EVENTOS ---

    // 1. Navegación Principal (Escritorio)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.currentTarget.dataset.page;
            if (pageId) {
                navigateTo(pageId);
            }
        });
    });

    // 2. Toggles de Formularios (Login/Registro)
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        formLogin.classList.remove('active');
        formRegister.classList.add('active');
    });
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        formRegister.classList.remove('active');
        formLogin.classList.add('active');
    });

    // 3. Envíos de Formularios
    formRegister.addEventListener('submit', handleRegister);
    formLogin.addEventListener('submit', handleLogin);

    // 4. Botón de Salir (Logout)
    logoutButton.addEventListener('click', handleLogout);

    // 5. Toggle de Tema
    initThemeToggle();

    // 6. Menú Móvil
    initMobileMenu();

    // --- PUNTO DE ENTRADA ---
    navigateTo('page-informacion');
    initScrollAnimations();

});
