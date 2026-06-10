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

const bouquet = document.getElementById("bouquet");

const images = [
    "images/1.png",
    "images/2.png",
    "images/3.png",
    "images/4.png",
    "images/5.png",
    "images/6.png",
    "images/7.png"
];

let currentImage = 0;

bouquet.addEventListener("click", () => {
    bouquet.classList.add("fade");

    setTimeout(() => {
        current = (current + 1) % images.length;
        bouquet.src = images[current];

        bouquet.classList.remove("fade");
    }, 400);
});
