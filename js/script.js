const currentPage = window.location.pathname.split("/").pop();

document.querySelectorAll(".nav-link").forEach(link => {

    const href = link.getAttribute("href");

    if(href === currentPage){
        link.classList.add("active");
    }
});

const galleryImages =
document.querySelectorAll(".gallery-image");

const lightbox =
document.querySelector(".lightbox");

const lightboxImage =
document.querySelector(".lightbox-image");

const closeBtn =
document.querySelector(".close");

const nextBtn =
document.querySelector(".next");

const prevBtn =
document.querySelector(".prev");

let currentIndex = 0;

if(galleryImages.length){

    galleryImages.forEach((img,index)=>{

        img.addEventListener("click",()=>{

            currentIndex = index;

            lightboxImage.src = img.src;

            lightbox.classList.add("active");
        });

    });

    nextBtn.addEventListener("click",()=>{

        currentIndex++;

        if(currentIndex >= galleryImages.length){

            currentIndex = 0;
        }

        lightboxImage.src =
        galleryImages[currentIndex].src;
    });

    prevBtn.addEventListener("click",()=>{

        currentIndex--;

        if(currentIndex < 0){

            currentIndex =
            galleryImages.length - 1;
        }

        lightboxImage.src =
        galleryImages[currentIndex].src;
    });

    closeBtn.addEventListener("click",()=>{

        lightbox.classList.remove("active");
    });

    document.addEventListener("keydown",(e)=>{

        if(e.key === "Escape"){

            lightbox.classList.remove("active");
        }

        if(e.key === "ArrowRight"){

            nextBtn.click();
        }

        if(e.key === "ArrowLeft"){

            prevBtn.click();
        }
    });

}

// ==========================================
// 3D MULTI-OBJECT FLOATING PHYSICS (MOBILE OPTIMIZED)
// ==========================================

const currentPath = window.location.pathname;
const currentFileName = currentPath.split("/").pop();
const isHomePage = currentFileName === "index.html" || currentFileName === "" || currentPath.endsWith("/");

const container = document.getElementById("canvas-container");

if (isHomePage && container) {

    const isMobile = window.innerWidth < 700;

    // 1. Szene & Kamera
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        45, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        100
    );
    camera.position.set(0, 0, 10);

    // SPEICHER-DRUCK SENKEN: Low-Power-Hint & feste PixelRatio auf Mobilgeräten
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: !isMobile, // Deaktiviert Antialiasing auf Handys für massiv mehr RAM
        powerPreference: "low-power" 
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Auf dem Handy erzwingen wir 1.0 (statt 2.0/3.0 Retina), was Abstürze verhindert!
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Lichtquellen (Dezentes Licht ohne schwere Schatten-Shadowmaps)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 8, 5);
    scene.add(dirLight);

    // 2. Physik-Welt (Performance-Modus)
    const world = new CANNON.World();
    world.gravity.set(0, 0, 0); 
    
    // Einfacherer Solver spart CPU auf Handys
    world.solver.iterations = isMobile ? 5 : 10; 

    const smoothMaterial = new CANNON.Material("smoothMaterial");
    const contactMaterial = new CANNON.ContactMaterial(
        smoothMaterial,
        smoothMaterial,
        {
            friction: 0.1,
            restitution: 0.01
        }
    );
    world.addContactMaterial(contactMaterial);

    // -------------------------------------------------------------
    // BILDSCHIRMGRENZEN
    // -------------------------------------------------------------
    let wallBodies = [];
    let topLimitY = 0;

    const createBounds = () => {
        wallBodies.forEach(wall => world.removeBody(wall));
        wallBodies = [];

        const navbarHeightPx = isMobile ? 100 : 90;

        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const height = 2 * Math.tan(vFOV / 2) * camera.position.z;
        const width = height * camera.aspect;

        const boundMargin = 0.2;
        const w = (width / 2) + boundMargin;
        const h = (height / 2) + boundMargin;

        const navbarIn3DUnits = (navbarHeightPx / window.innerHeight) * height;
        topLimitY = h - navbarIn3DUnits;

        const planeShape = new CANNON.Plane();
        
        const walls = [
            { pos: [0, -h, 0],        rot: [-Math.PI / 2, 0, 0] }, // Unten
            { pos: [0, topLimitY, 0], rot: [Math.PI / 2, 0, 0] },  // Oben
            { pos: [-w, 0, 0],        rot: [0, Math.PI / 2, 0] },  // Links
            { pos: [w, 0, 0],         rot: [0, -Math.PI / 2, 0] }   // Rechts
        ];

        walls.forEach(wSpec => {
            const wallBody = new CANNON.Body({ mass: 0, material: smoothMaterial });
            wallBody.addShape(planeShape);
            wallBody.position.set(...wSpec.pos);
            wallBody.quaternion.setFromEuler(...wSpec.rot);
            world.addBody(wallBody);
            wallBodies.push(wallBody);
        });
    };
    createBounds();

    // -------------------------------------------------------------
    // 3. OBJEKTE PLATZIEREN & MODEL-SPEICHER OPTIMIEREN
    // -------------------------------------------------------------
    const itemsToLoad = [
        { file: 'models/nikon.glb',      scaleD: 3.0, scaleM: 1.1, startX: -2.6, rotateY: 0 },
        { file: 'models/feuerzeug.glb',  scaleD: 3.0, scaleM: 1.1, startX: -0.8, rotateY: 0 },
        { file: 'models/feuerzeug.glb',  scaleD: 3.0, scaleM: 1.1, startX: 0.8,  rotateY: Math.PI },
        { file: 'models/sketchbook.glb', scaleD: 3.8, scaleM: 1.4, startX: 2.6, rotateY: Math.PI }
    ];

    const interactiveObjects = [];
    const loader = new THREE.GLTFLoader();

    itemsToLoad.forEach((item) => {
        loader.load(item.file, (gltf) => {
            const mesh = gltf.scene;

            // Speicher-Optimierung der Texturen & Geometrien beim Laden
            mesh.traverse((child) => {
                if (child.isMesh) {
                    // Verhindert unnötig hohe Textur-Berechnungen
                    if (child.material.map) child.material.map.generateMipmaps = false; 
                }
            });

            const scale = isMobile ? item.scaleM : item.scaleD;
            mesh.scale.set(scale, scale, scale);

            if (item.rotateY) {
                mesh.rotation.y = item.rotateY;
            }

            scene.add(mesh);

            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            box.getSize(size);

            // Vereinfachte Kugel/Box-Kollisionsform spart massiv Physik-CPU
            const radius = Math.max(size.x, size.y) / 2.2;
            const shape = isMobile 
                ? new CANNON.Sphere(radius) 
                : new CANNON.Box(new CANNON.Vec3(size.x / 2.1, size.y / 2.1, size.z / 2.1));

            const posX = isMobile ? item.startX * 0.35 : item.startX;

            const body = new CANNON.Body({
                mass: 1,
                shape: shape,
                material: smoothMaterial,
                position: new CANNON.Vec3(posX, 0, 0),
                angularDamping: 0.85,
                linearDamping: 0.75
            });

            body.quaternion.copy(mesh.quaternion);

            world.addBody(body);
            interactiveObjects.push({ mesh, body });

        }, undefined, (error) => {
            console.error(`Fehler beim Laden von ${item.file}:`, error);
        });
    });

    // 4. Drag & Drop Interaktion (Drosselung gegen Lag/Crash)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let selectedItem = null;
    let dragPlane = new THREE.Plane();
    let planeIntersect = new THREE.Vector3();

    function getPointerPos(e) {
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (x / window.innerWidth) * 2 - 1,
            y: -(y / window.innerHeight) * 2 + 1
        };
    }

    function onPointerDown(e) {
        if (interactiveObjects.length === 0) return;

        const pos = getPointerPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;

        raycaster.setFromCamera(mouse, camera);
        const meshesToTest = interactiveObjects.map(obj => obj.mesh);
        const intersects = raycaster.intersectObjects(meshesToTest, true);

        if (intersects.length > 0) {
            let hitMesh = intersects[0].object;
            while (hitMesh.parent && hitMesh.parent !== scene) {
                hitMesh = hitMesh.parent;
            }

            selectedItem = interactiveObjects.find(obj => obj.mesh === hitMesh);

            if (selectedItem) {
                isDragging = true;
                if (e.cancelable) e.preventDefault();

                dragPlane.setFromNormalAndCoplanarPoint(
                    camera.getWorldDirection(new THREE.Vector3()).negate(),
                    selectedItem.mesh.position
                );
            }
        }
    }

    function onPointerMove(e) {
        if (!isDragging || !selectedItem) return;

        if (e.cancelable) e.preventDefault();

        const pos = getPointerPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;

        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
            const objectPadding = isMobile ? 0.4 : 0.6;
            const targetY = Math.min(planeIntersect.y, topLimitY - objectPadding);

            selectedItem.body.position.set(planeIntersect.x, targetY, planeIntersect.z);
            selectedItem.body.velocity.set(0, 0, 0); 
            selectedItem.body.angularVelocity.set(0.1, 0.1, 0); 
        }
    }

    function onPointerUp() {
        if (isDragging && selectedItem) {
            isDragging = false;
            selectedItem.body.velocity.set(0, 0, 0);
            selectedItem = null;
        }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    window.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);

    // 5. Resize Event
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        createBounds();
    });

    // 6. Animation Loop
    const timeStep = 1 / 60;
    function animate() {
        requestAnimationFrame(animate);

        world.step(timeStep);

        interactiveObjects.forEach(obj => {
            obj.body.position.z *= 0.8;
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });

        renderer.render(scene, camera);
    }

    animate();
}