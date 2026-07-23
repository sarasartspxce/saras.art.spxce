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
// 3D NIKON OBJECT WITH PHYSICS (index.html)
// ==========================================

// Erkennung der Startseite (funktioniert auch direkt über die Haupt-URL / GitHub Pages)
const currentPath = window.location.pathname;
const currentFileName = currentPath.split("/").pop();
const isHomePage = currentFileName === "index.html" || currentFileName === "" || currentPath.endsWith("/");

const container = document.getElementById("canvas-container");

if (isHomePage && container) {
    
    // 1. Szene, Kamera & Renderer initialisieren
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
    world.gravity.set(0, -2.5, 0); // Sanfte/leichte Gravitation für schwebendes Gefühl

    // Unsichtbarer Boden, damit das Objekt nicht unendlich tief fällt
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.position.set(0, -3.5, 0);
    world.addBody(groundBody);

    // Variablen für Mesh & Body
    let nikonMesh = null;
    let nikonBody = null;

    // 3. GLTF Modell laden
    const loader = new THREE.GLTFLoader();
    loader.load('models/nikon.glb', (gltf) => {
        nikonMesh = gltf.scene;

        // -------------------------------------------------------------
        // 1. RESPONSIVE SKALIERUNG BERECHNEN
        // -------------------------------------------------------------
        const isMobile = window.innerWidth < 700;
        const baseScale = isMobile ? 2.5 : 4.0;

        nikonMesh.scale.set(baseScale, baseScale, baseScale);
        scene.add(nikonMesh);

        // -------------------------------------------------------------
        // 2. PHYSIK-BOX AN NEUE GRÖSSE ANPASSEN
        // -------------------------------------------------------------
        const box = new THREE.Box3().setFromObject(nikonMesh);
        const size = new THREE.Vector3();
        box.getSize(size);

        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        nikonBody = new CANNON.Body({
            mass: 1,
            shape: shape,
            position: new CANNON.Vec3(0, 4, 0),
            angularDamping: 0.4,
            linearDamping: 0.3
        });

        nikonBody.angularVelocity.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );

        world.addBody(nikonBody);
    }, undefined, (error) => {
        console.error("Fehler beim Laden des 3D-Modells:", error);
    });

    // 4. Interaktion: Drag & Drop (Maus & Touch)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
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
        if (!nikonMesh || !nikonBody) return;

        const pos = getPointerPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(nikonMesh, true);

        if (intersects.length > 0) {
            isDragging = true;

            if (e.cancelable) {
                e.preventDefault();
            }

            dragPlane.setFromNormalAndCoplanarPoint(
                camera.getWorldDirection(new THREE.Vector3()).negate(),
                nikonMesh.position
            );
        }
    }

    function onPointerMove(e) {
        if (!isDragging || !nikonBody) return;

        if (e.cancelable) {
            e.preventDefault();
        }

        const pos = getPointerPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;

        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
            nikonBody.position.copy(planeIntersect);
            nikonBody.velocity.set(0, 0, 0);
            nikonBody.angularVelocity.set(0.5, 0.5, 0);
        }
    }

    function onPointerUp() {
        if (isDragging && nikonBody) {
            isDragging = false;
            nikonBody.velocity.set(0, -1, 0);
        }
    }

    // Event-Listener für Desktop & Mobile
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    window.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);

    // 5. Responsive Anpassung bei Resize
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

        if (nikonMesh && nikonBody) {
            nikonMesh.position.copy(nikonBody.position);
            nikonMesh.quaternion.copy(nikonBody.quaternion);
        }

        renderer.render(scene, camera);
    }

    animate();
}