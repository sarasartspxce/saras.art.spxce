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
// 3D MULTI-OBJECT FLOATING PHYSICS (index.html)
// ==========================================

const currentPath = window.location.pathname;
const currentFileName = currentPath.split("/").pop();
const isHomePage = currentFileName === "index.html" || currentFileName === "" || currentPath.endsWith("/");

const container = document.getElementById("canvas-container");

if (isHomePage && container) {

    // 1. Szene, Kamera & Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        45, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lichtquellen
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 2. Physik-Welt (Keine Gravitation für Schwebe-Gefühl)
    const world = new CANNON.World();
    world.gravity.set(0, 0, 0); // Schwerelosigkeit

    // Material mit fast NULL Restitution (Absolut kein Bouncen/Federn)
    const smoothMaterial = new CANNON.Material("smoothMaterial");
    const contactMaterial = new CANNON.ContactMaterial(
        smoothMaterial,
        smoothMaterial,
        {
            friction: 0.2,     // Leichtes Vorbeigleiten
            restitution: 0.01  // 👈 Fast 0: Verhindert Zurückfedern am Rand & bei Objekten
        }
    );
    world.addContactMaterial(contactMaterial);

    // -------------------------------------------------------------
    // BILDSCHIRMGRENZEN (Mit Abstand für die Navbar oben)
    // -------------------------------------------------------------
    // Höhe deiner Navigation in Pixeln (passe die 90px an deine Navbar an!)
    const NAVBAR_HEIGHT_PX = 90; 

    // Wir merken uns die Obergrenze weltweit für die Drag-Funktion
    let topLimitY = 0; 

    const createBounds = () => {
        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const height = 2 * Math.tan(vFOV / 2) * camera.position.z;
        const width = height * camera.aspect;

        const boundMargin = 0.4;
        const w = width / 2 + boundMargin;
        const h = height / 2 + boundMargin;

        // Umrechnung der Navbar-Höhe in Drei.js / Cannon.js 3D-Einheiten
        const navbarIn3DUnits = (NAVBAR_HEIGHT_PX / window.innerHeight) * height;
        
        // Die neue Obergrenze ist der obere Rand minus die Navbar-Höhe
        topLimitY = h - navbarIn3DUnits;

        const planeShape = new CANNON.Plane();
        
        const walls = [
            { pos: [0, -h, 0],         rot: [-Math.PI / 2, 0, 0] }, // Unten
            { pos: [0, topLimitY, 0],  rot: [Math.PI / 2, 0, 0] },  // Oben (stoppt UNTER der Navbar!)
            { pos: [-w, 0, 0],         rot: [0, Math.PI / 2, 0] },  // Links
            { pos: [w, 0, 0],          rot: [0, -Math.PI / 2, 0] }   // Rechts
        ];

        walls.forEach(wSpec => {
            const wallBody = new CANNON.Body({ mass: 0, material: smoothMaterial });
            wallBody.addShape(planeShape);
            wallBody.position.set(...wSpec.pos);
            wallBody.quaternion.setFromEuler(...wSpec.rot);
            world.addBody(wallBody);
        });
    };
    createBounds();

    // -------------------------------------------------------------
    // 3. OBJEKTE SAUBER NEBENEINANDER PLATZIEREN
    // -------------------------------------------------------------
    const isMobile = window.innerWidth < 700;

    // Objekte definiert mit angepasster Größe (scaleD / scaleM) & optionaler Drehung
    const itemsToLoad = [
        { file: 'models/nikon.glb',      scaleD: 3.0, scaleM: 1.8, startX: -2.6, rotateY: 0 },
        { file: 'models/feuerzeug.glb',  scaleD: 3.0, scaleM: 1.8, startX: -0.5, rotateY: 0 },
        { file: 'models/feuerzeug.glb',  scaleD: 3.0, scaleM: 1.8, startX: 0.5,  rotateY: Math.PI },
        { file: 'models/sketchbook.glb', scaleD: 3.8, scaleM: 2.3, startX: 2.6, rotateY: Math.PI }
    ];

    const interactiveObjects = [];
    const loader = new THREE.GLTFLoader();

    itemsToLoad.forEach((item) => {
        loader.load(item.file, (gltf) => {
            const mesh = gltf.scene;

            // 1. Größe anpassen
            const scale = isMobile ? item.scaleM : item.scaleD;
            mesh.scale.set(scale, scale, scale);

            // 2. Start-Rotation anwenden (z. B. 180° Drehung für das 2. Feuerzeug)
            if (item.rotateY) {
                mesh.rotation.y = item.rotateY;
            }

            scene.add(mesh);

            // Bounding Box für physikalischen Rahmen
            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            box.getSize(size);

            // Physik-Shape basierend auf der neuen Größe berechnen
            const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2.1, size.y / 2.1, size.z / 2.1));

            // Auf Handy etwas enger zusammenrücken
            const posX = isMobile ? item.startX * 0.45 : item.startX;

            const body = new CANNON.Body({
                mass: 1,
                shape: shape,
                material: smoothMaterial,
                position: new CANNON.Vec3(posX, 0, 0),
                angularDamping: 0.85,
                linearDamping: 0.75
            });

            // Die optische Drehung auch an die Physik übertragen
            body.quaternion.copy(mesh.quaternion);

            // Minimale Bewegung zum Start für ein sanftes Schweben
            body.velocity.set(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                0
            );

            world.addBody(body);
            interactiveObjects.push({ mesh, body });

        }, undefined, (error) => {
            console.error(`Fehler beim Laden von ${item.file}:`, error);
        });
    });

    // 4. Drag & Drop Interaktion
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
            // Begrenze Y, damit die Maus das Objekt nicht über die Navbar ziehen kann
            // Der Wert 0.6 ist ein kleiner Puffer für den halben Objekt-Körper
            const targetY = Math.min(planeIntersect.y, topLimitY - 0.4);

            selectedItem.body.position.set(planeIntersect.x, targetY, planeIntersect.z);
            selectedItem.body.velocity.set(0, 0, 0); 
            selectedItem.body.angularVelocity.set(0.3, 0.3, 0); 
        }
    }

    function onPointerUp() {
        if (isDragging && selectedItem) {
            isDragging = false;
            selectedItem.body.velocity.set(0, 0, 0); // Stoppt sofort sanft beim Loslassen
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
    });

    // 6. Animation Loop
    const timeStep = 1 / 60;
    function animate() {
        requestAnimationFrame(animate);

        world.step(timeStep);

        interactiveObjects.forEach(obj => {
            // Verhindert, dass Objekte in die Tiefe (Z-Achse) wegwandern
            obj.body.position.z *= 0.8;

            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });

        renderer.render(scene, camera);
    }

    animate();
}