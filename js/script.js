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
// 3D MULTI-OBJECT PHYSICS (index.html)
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 2. Physik-Welt (Cannon.js)
    const world = new CANNON.World();
    world.gravity.set(0, -3.0, 0); // Leicht verstärkt für stabileres Stapeln

    // Material & Dämpfung für Objekte
    const objectMaterial = new CANNON.Material("objectMaterial");
    const contactMaterial = new CANNON.ContactMaterial(
        objectMaterial,
        objectMaterial,
        {
            friction: 0.5,    // Ausreichend Reibung zum Stapeln
            restitution: 0.05 // Kaum Federn
        }
    );
    world.addContactMaterial(contactMaterial);

    // Unsichtbarer Boden
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
        material: objectMaterial
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.position.set(0, -3.5, 0);
    world.addBody(groundBody);

    // -------------------------------------------------------------
    // 3. OBJEKT-LISTE DEFINIEREN (Nikon, Sketchbook, 2x Feuerzeug)
    // -------------------------------------------------------------
    const isMobile = window.innerWidth < 700;

    const itemsToLoad = [
        { file: 'models/nikon.glb', scaleDesktop: 3.5, scaleMobile: 2.2, startX: -1.5 },
        { file: 'models/sketchbook.glb', scaleDesktop: 3.0, scaleMobile: 1.8, startX: 1.5 },
        { file: 'models/feuerzeug.glb', scaleDesktop: 2.5, scaleMobile: 1.5, startX: -0.5 },
        { file: 'models/feuerzeug.glb', scaleDesktop: 2.5, scaleMobile: 1.5, startX: 0.8 }
    ];

    // Listen für Mesh & Physik-Körper
    const interactiveObjects = []; // Speichert Paar aus { mesh, body }
    const loader = new THREE.GLTFLoader();

    // Schleife lädt jedes Objekt einzeln
    itemsToLoad.forEach((item, index) => {
        loader.load(item.file, (gltf) => {
            const mesh = gltf.scene;

            // Skalierung anpassen
            const scale = isMobile ? item.scaleMobile : item.scaleDesktop;
            mesh.scale.set(scale, scale, scale);
            scene.add(mesh);

            // Bounding Box für physikalische Form messen
            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            box.getSize(size);

            const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
            
            // Versetzte Startpositionen oben, damit sie nacheinander sanft runterfallen
            const startY = 4 + (index * 1.8);

            const body = new CANNON.Body({
                mass: 1,
                shape: shape,
                material: objectMaterial,
                position: new CANNON.Vec3(item.startX, startY, 0),
                angularDamping: 0.5,
                linearDamping: 0.3
            });

            // Leichte zufällige Drehung beim Auftauchen
            body.angularVelocity.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );

            world.addBody(body);

            // Objekt in unserer Arbeitsliste speichern
            interactiveObjects.push({ mesh, body });

        }, undefined, (error) => {
            console.error(`Fehler beim Laden von ${item.file}:`, error);
        });
    });

    // 4. Drag & Drop Interaktion für Mehrfach-Objekte
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let selectedItem = null; // Speichert das aktuell gegriffene Objekt
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

        // Alle 3D-Meshes sammeln für Treffertest
        const meshesToTest = interactiveObjects.map(obj => obj.mesh);
        const intersects = raycaster.intersectObjects(meshesToTest, true);

        if (intersects.length > 0) {
            // Finden, zu welchem Objekt aus der Liste das getroffene Mesh gehört
            let hitMesh = intersects[0].object;
            while (hitMesh.parent && hitMesh.parent !== scene) {
                hitMesh = hitMesh.parent;
            }

            selectedItem = interactiveObjects.find(obj => obj.mesh === hitMesh);

            if (selectedItem) {
                isDragging = true;

                if (e.cancelable) {
                    e.preventDefault();
                }

                dragPlane.setFromNormalAndCoplanarPoint(
                    camera.getWorldDirection(new THREE.Vector3()).negate(),
                    selectedItem.mesh.position
                );
            }
        }
    }

    function onPointerMove(e) {
        if (!isDragging || !selectedItem) return;

        if (e.cancelable) {
            e.preventDefault();
        }

        const pos = getPointerPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;

        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
            selectedItem.body.position.copy(planeIntersect);
            selectedItem.body.velocity.set(0, 0, 0);
            selectedItem.body.angularVelocity.set(0.2, 0.2, 0);
        }
    }

    function onPointerUp() {
        if (isDragging && selectedItem) {
            isDragging = false;
            selectedItem.body.velocity.set(0, -0.5, 0);
            selectedItem = null;
        }
    }

    // Event-Listener
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

    // 6. Animation Loop (Synchronisiert alle Objekte)
    const timeStep = 1 / 60;
    function animate() {
        requestAnimationFrame(animate);

        world.step(timeStep);

        // Alle geladenen Objekte mit ihren Physik-Körpern abgleichen
        interactiveObjects.forEach(obj => {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });

        renderer.render(scene, camera);
    }

    animate();
}