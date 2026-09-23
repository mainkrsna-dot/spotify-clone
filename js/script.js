let sections = document.querySelectorAll(".cards-container section");

function updateButtons(section) {

    let leftBtn = section.parentElement.querySelector(".left-btn");
    let rightBtn = section.parentElement.querySelector(".right-btn");

    if (section.scrollLeft === 0) {
        leftBtn.style.display = "none";
    } else {
        leftBtn.style.display = "flex";
    }

    if (section.scrollLeft + section.clientWidth >= section.scrollWidth - 1) {
        rightBtn.style.display = "none";
    } else {
        rightBtn.style.display = "flex";
    }
}


sections.forEach(section => {

    updateButtons(section);

    section.addEventListener("scroll", () => {
        updateButtons(section);
    });

});


let leftBtn = document.querySelectorAll(".left-btn");

leftBtn.forEach(element => {

    element.addEventListener("click", event => {

        let section = event.currentTarget.parentElement.querySelector("section");

        section.scrollBy({
            left: -300,
            behavior: "smooth"
        });

    });

});


let rightBtn = document.querySelectorAll(".right-btn");

rightBtn.forEach(element => {

    element.addEventListener("click", event => {

        let section = event.currentTarget.parentElement.querySelector("section");

        section.scrollBy({
            left: 300,
            behavior: "smooth"
        });

    });

});

let songImage = document.querySelector(".song-image");
let currentSongName = document.querySelector(".current-song-name");
let artistName = document.querySelector(".artist-name");

let bottomPlayer = document.querySelector(".bottom-player");

let playButtons = document.querySelectorAll(".play-button")

let audio = new Audio();

let currentButton = null;

let controlButtons = document.querySelectorAll(".controls button");

controlButtons[1].addEventListener("click", () => {

    if (audio.paused) {
        audio.play();
        controlButtons[1].textContent = "⏸";

        if (currentButton !== null) {
            currentButton.textContent = "⏸";
        }

    } else {
        audio.pause();
        controlButtons[1].textContent = "▶";

        if (currentButton !== null) {
            currentButton.textContent = "▶";
        }
    }

});

playButtons.forEach(button => {
    button.addEventListener("click", () => {

        let card = button.parentElement.parentElement;


        let image = card.querySelector("img")
        let songName = card.querySelector("h3")
        let artist = card.querySelector("p")

        songImage.src = image.src;
        currentSongName.textContent = songName.textContent;
        artistName.textContent = artist.textContent;

        bottomPlayer.style.display = "flex";

        if (button === currentButton) {

            if (audio.paused) {
                audio.play();
                button.textContent = "⏸";
                controlButtons[1].textContent = "⏸";
            } else {
                audio.pause();
                button.textContent = "▶";
                controlButtons[1].textContent = "▶";
            }

        }
        else {
            if (currentButton !== null) {
                currentButton.textContent = "▶"
            }

            audio.src = button.dataset.song;
            currentButton = button;
            audio.play();

            button.textContent = "⏸"
            controlButtons[1].textContent = "⏸";
        }
    })
});

audio.addEventListener("ended", () => {
    if (currentButton !== null) {
        currentButton.textContent = "▶";
        currentButton = null;
    }

    controlButtons[1].textContent = "▶";
})

let seekbar = document.querySelector(".seekbar-container input");
let currentTimeDisplay = document.querySelector(".seekbar-container span:first-child");
let durationDisplay = document.querySelector(".seekbar-container span:last-child");

audio.addEventListener("loadedmetadata", () => {
    seekbar.max = audio.duration;
    durationDisplay.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    seekbar.value = audio.currentTime;
    currentTimeDisplay.textContent = formatTime(audio.currentTime);
});

seekbar.addEventListener("input", () => {
    audio.currentTime = seekbar.value;
});

function formatTime(seconds) {
    let minutes = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);

    if (secs < 10) {
        secs = "0" + secs;
    }

    return `${minutes}:${secs}`;
}

let volumeSlider = document.querySelector(".volume-control input");

volumeSlider.addEventListener("input", () => {
    audio.volume = volumeSlider.value / 100;
});