document.addEventListener("DOMContentLoaded", () => {
    // DOM elements
    const CARD_SELECTOR =
        ".card, .artists-card, .album-and-singles-card, .radio-card, .charts-card";

    const cards = document.querySelectorAll(CARD_SELECTOR);
    const sections = document.querySelectorAll(".cards-container section");

    const searchInput = document.querySelector(".searchBar input");
    const searchBar = document.querySelector(".searchBar");
    const footer = document.querySelector(".footer");

    const mobileSearchInput = document.querySelector(".mobile-search-input");
    const mobileSearchClose = document.querySelector(".mobile-search-close");

    const bottomPlayer = document.querySelector(".bottom-player");
    const songImage = document.querySelector(".song-image");
    const expandedSongImage = document.querySelector(".expanded-song-image");
    const currentSongName = document.querySelector(".current-song-name");
    const artistName = document.querySelector(".artist-name");

    const playButtons = document.querySelectorAll(".play-button");
    const controlButtons = document.querySelectorAll(".controls button");

    const collapsePlayer = document.querySelector(".collapse-player");
    const playerMenu = document.querySelector(".player-menu");
    const playerMenuWrapper = document.querySelector(".player-menu-wrapper");

    const deviceButton = document.querySelector(".device-btn");
    const shareButton = document.querySelector(".share-btn");
    const likeButton = document.querySelector(".like-song");

    const seekbar = document.querySelector(".seekbar-container input");
    const currentTimeDisplay = document.querySelector(
        ".seekbar-container span:first-child"
    );
    const durationDisplay = document.querySelector(
        ".seekbar-container span:last-child"
    );

    const volumeSlider = document.querySelector(".volume-control input");

    const mobileNavButtons = document.querySelectorAll(
        ".mobile-bottom-nav button"
    );
    const homeButton = mobileNavButtons[0];
    const searchButton = mobileNavButtons[1];
    const libraryButton = mobileNavButtons[2];

    const mobilePageTitle = document.querySelector(".mobile-page-title");

    const settingsWrapper = document.querySelector(".settings-wrapper");
    const mobileSettings = document.querySelector(".mobile-settings");
    const settingsOptions = document.querySelectorAll(".settings-option");

    const autoplayValue = document.querySelector("#autoplay-value");
    const audioQualityValue = document.querySelector("#audio-quality-value");
    const dataToggle = document.querySelector("#data-toggle");
    const notificationValue = document.querySelector("#notification-value");
    const themeValue = document.querySelector("#theme-value");

    const audio = new Audio();
    const songBackgrounds = new Map();

    // Player state
    let currentButton = null;
    let currentPlaylist = [];
    let currentIndex = 0;
    let currentSong = null;

    let isShuffleOn = false;
    let isRepeatOn = false;

    let autoplayEnabled =
        localStorage.getItem("spotifyAutoplay") !== "false";

    let dataSaverEnabled =
        localStorage.getItem("spotifyDataSaver") === "true";

    let selectedAudioQuality =
        localStorage.getItem("spotifyAudioQuality") || "Normal";

    let lightTheme =
        localStorage.getItem("spotifyTheme") === "light";

    let runSearch = () => { };

    // Shared helpers
    function normalizeText(text) {
        return String(text || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "0:00";
        }

        const minutes = Math.floor(seconds / 60);
        const secs = String(Math.floor(seconds % 60)).padStart(2, "0");

        return `${minutes}:${secs}`;
    }

    function getSavedSongs() {
        try {
            const songs = JSON.parse(
                localStorage.getItem("spotifyCloneLikedSongs") || "[]"
            );

            return Array.isArray(songs) ? songs : [];
        } catch {
            return [];
        }
    }

    function saveSongs(songs) {
        try {
            localStorage.setItem(
                "spotifyCloneLikedSongs",
                JSON.stringify(songs)
            );
        } catch (error) {
            console.error("Unable to save liked songs:", error);
            showSpotifyToast("Unable to save liked songs.");
        }
    }

    function getSongBackground(imageSrc) {
        if (!imageSrc) {
            return "linear-gradient(180deg, #333333, #111111)";
        }

        if (songBackgrounds.has(imageSrc)) {
            return songBackgrounds.get(imageSrc);
        }

        let hash = 0;

        for (let i = 0; i < imageSrc.length; i++) {
            hash = imageSrc.charCodeAt(i) + ((hash << 5) - hash);
        }

        hash = Math.abs(hash);

        const hue = hash % 360;
        const saturation = 45 + (hash % 20);
        const lightness = 25 + (hash % 15);

        const background = `linear-gradient(
            180deg,
            hsl(${hue}, ${saturation}%, ${lightness + 10}%),
            hsl(${hue}, ${saturation - 10}%, ${lightness - 8}%)
        )`;

        songBackgrounds.set(imageSrc, background);

        return background;
    }

    function updatePlayerBackground(imageSrc) {
        bottomPlayer?.style.setProperty(
            "--player-bg",
            getSongBackground(imageSrc)
        );
    }

    function updateExpandedImage(imageSrc) {
        if (expandedSongImage) {
            expandedSongImage.src = imageSrc || "";
        }
    }

    function refreshScrollButtons() {
        sections.forEach(section => {
            section.dispatchEvent(new Event("scroll"));
        });
    }

    // Horizontal card scrolling
    function updateButtons(section) {
        const parent = section.parentElement;
        const leftButton = parent?.querySelector(".left-btn");
        const rightButton = parent?.querySelector(".right-btn");

        if (!leftButton || !rightButton) {
            return;
        }

        leftButton.style.display =
            section.scrollLeft > 0 ? "flex" : "none";

        rightButton.style.display =
            section.scrollLeft + section.clientWidth >= section.scrollWidth - 1
                ? "none"
                : "flex";
    }

    sections.forEach(section => {
        updateButtons(section);
        section.addEventListener("scroll", () => updateButtons(section));
    });

    document.querySelectorAll(".left-btn").forEach(button => {
        button.addEventListener("click", event => {
            const section =
                event.currentTarget.parentElement?.querySelector("section");

            section?.scrollBy({
                left: -300,
                behavior: "smooth"
            });
        });
    });

    document.querySelectorAll(".right-btn").forEach(button => {
        button.addEventListener("click", event => {
            const section =
                event.currentTarget.parentElement?.querySelector("section");

            section?.scrollBy({
                left: 300,
                behavior: "smooth"
            });
        });
    });

    // Search
    if (searchInput) {
        const searchSections =
            document.querySelectorAll(".section-wrapper");

        const noResultsMessage = document.createElement("div");
        noResultsMessage.className = "search-no-results";
        noResultsMessage.textContent = "No results found";
        noResultsMessage.style.display = "none";

        const rightContainer = document.querySelector(".right");
        rightContainer?.appendChild(noResultsMessage);

        function getCardSearchText(card) {
            let text = card.innerText || "";

            card.querySelectorAll("img").forEach(img => {
                text += ` ${img.alt || ""}`;
            });

            text += ` ${card.dataset.song || ""}`;
            text += ` ${card.dataset.artist || ""}`;
            text += ` ${card.dataset.album || ""}`;
            text += ` ${card.dataset.title || ""}`;

            if (card.dataset.playlist) {
                try {
                    const playlist = JSON.parse(card.dataset.playlist);

                    if (Array.isArray(playlist)) {
                        playlist.forEach(song => {
                            if (typeof song === "string") {
                                text += ` ${song}`;
                            } else if (song && typeof song === "object") {
                                text += ` ${song.title || ""}`;
                                text += ` ${song.name || ""}`;
                                text += ` ${song.artist || ""}`;
                                text += ` ${song.album || ""}`;
                            }
                        });
                    }
                } catch {
                    // Ignore invalid playlist data.
                }
            }

            return normalizeText(text);
        }

        const cardSearchData = [...cards].map(card => ({
            element: card,
            text: getCardSearchText(card)
        }));

        function performSearch(value = searchInput.value) {
            const query = normalizeText(value);

            if (!query) {
                cardSearchData.forEach(({ element }) => {
                    element.hidden = false;
                });

                searchSections.forEach(section => {
                    section.hidden = false;
                    section.classList.remove("search-hidden");
                });

                noResultsMessage.style.display = "none";

                if (footer) {
                    footer.style.display = "";
                }

                searchBar?.classList.remove("search-active");
                refreshScrollButtons();
                return;
            }

            searchBar?.classList.add("search-active");

            const queryWords = query.split(" ");
            let totalMatches = 0;

            cardSearchData.forEach(({ element, text }) => {
                const matches = queryWords.every(word =>
                    text.includes(word)
                );

                element.hidden = !matches;

                if (matches) {
                    totalMatches++;
                }
            });

            searchSections.forEach(section => {
                const visibleCards = section.querySelectorAll(
                    `${CARD_SELECTOR}:not([hidden])`
                );

                const isEmpty = visibleCards.length === 0;

                section.hidden = isEmpty;
                section.classList.toggle("search-hidden", isEmpty);
            });

            noResultsMessage.style.display =
                totalMatches === 0 ? "block" : "none";

            if (footer) {
                footer.style.display = totalMatches === 0 ? "none" : "";
            }

            refreshScrollButtons();
        }

        runSearch = performSearch;
        
        searchInput.addEventListener("input", () => {
            performSearch(searchInput.value);
        });

        const searchIcon = searchBar?.querySelector('img[src*="search"]');

        searchIcon?.addEventListener("click", () => {
            searchInput.focus();
        });

        if (searchIcon) {
            searchIcon.style.cursor = "pointer";
        }

        searchInput.addEventListener("keydown", event => {
            if (event.key !== "Escape") {
                return;
            }

            searchInput.value = "";
            performSearch();
            searchInput.blur();
        });
    }

    if (mobileSearchInput) {
        mobileSearchInput.addEventListener("input", () => {
            runSearch(mobileSearchInput.value);
        });
    }

    if (mobileSearchClose) {
        mobileSearchClose.addEventListener("click", event => {
            event.stopPropagation();

            if (mobileSearchInput) {
                mobileSearchInput.value = "";
                mobileSearchInput.blur();
            }

            runSearch("");
            document.body.classList.remove("mobile-search-active");
        });
    }

    // Player playback
    function setPlayState(isPlaying) {
        const icon = isPlaying ? "⏸" : "▶";

        if (controlButtons.length >= 2) {
            controlButtons[1].textContent = icon;
        }

        if (currentButton) {
            currentButton.textContent = icon;
        }
    }

    async function playAudio() {
        try {
            await audio.play();
            setPlayState(true);
        } catch (error) {
            setPlayState(false);
            console.error("Audio playback error:", error);
        }
    }

    function pauseAudio() {
        audio.pause();
        setPlayState(false);
    }

    function updateLikeButton() {
        if (!likeButton || !currentSong) {
            return;
        }

        const likedSongs = getSavedSongs();
        const isLiked = likedSongs.some(
            song => song.audio === currentSong.audio
        );

        likeButton.classList.toggle("liked", isLiked);
        likeButton.textContent = isLiked ? "♥" : "♡";
    }

    function loadSong(song) {
        if (!song) {
            return;
        }

        if (currentButton && song.sourceButton && currentButton !== song.sourceButton) {
            currentButton.textContent = "▶";
        }

        currentSong = song;
        currentButton = song.sourceButton || null;

        audio.preload = dataSaverEnabled ? "none" : "auto";
        audio.src = song.audio || "";

        if (seekbar) {
            seekbar.value = 0;
            seekbar.max = 0;
        }

        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = "0:00";
        }

        if (durationDisplay) {
            durationDisplay.textContent = "0:00";
        }

        if (currentSongName) {
            currentSongName.textContent = song.title || "";
        }

        if (artistName) {
            artistName.textContent = song.artist || "";
        }

        if (songImage) {
            songImage.src = song.image || "";
        }

        updateExpandedImage(song.image);
        updatePlayerBackground(song.image);
        updateLikeButton();

        bottomPlayer?.classList.add("has-song");
    }

    function getCardData(button) {
        const card = button.closest(CARD_SELECTOR);

        if (!card) {
            return null;
        }

        return {
            card,
            image: card.querySelector("img"),
            songName: card.querySelector("h3"),
            artist: card.querySelector("p")
        };
    }

    function playSongFromButton(button) {
        if (!button) {
            return;
        }

        bottomPlayer?.classList.remove("expanded");

        const data = getCardData(button);

        if (!data) {
            return;
        }

        if (button === currentButton) {
            audio.paused ? playAudio() : pauseAudio();
            return;
        }

        if (currentButton) {
            currentButton.textContent = "▶";
        }

        const sectionWrapper = button.closest(".section-wrapper");
        const section = sectionWrapper?.querySelector("section");

        if (!section) {
            return;
        }

        currentPlaylist = [];
        currentIndex = 0;

        section.querySelectorAll(".play-button").forEach(sourceButton => {
            const sourceData = getCardData(sourceButton);

            if (!sourceData) {
                return;
            }

            if (sourceButton.dataset.playlist) {
                try {
                    const playlist = JSON.parse(sourceButton.dataset.playlist);

                    if (Array.isArray(playlist)) {
                        playlist.forEach(song => {
                            currentPlaylist.push({
                                ...song,
                                sourceButton
                            });
                        });
                    }
                } catch (error) {
                    console.error("Playlist JSON error:", error);
                }

                return;
            }

            if (sourceButton.dataset.song) {
                currentPlaylist.push({
                    audio: sourceButton.dataset.song,
                    title: sourceData.songName?.textContent || "",
                    artist: sourceData.artist?.textContent || "",
                    image: sourceData.image?.src || "",
                    sourceButton
                });
            }
        });

        if (!currentPlaylist.length) {
            return;
        }

        const clickedIndex = currentPlaylist.findIndex(
            song => song.sourceButton === button
        );

        if (clickedIndex === -1) {
            return;
        }

        currentIndex = clickedIndex;
        loadSong(currentPlaylist[currentIndex]);
        playAudio();
    }

    playButtons.forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            playSongFromButton(button);
        });
    });

    cards.forEach(card => {
        card.addEventListener("click", event => {
            if (event.target.closest(".play-button")) {
                return;
            }

            if (window.innerWidth > 768) {
                return;
            }

            const playButton = card.querySelector(".play-button");

            if (playButton) {
                playSongFromButton(playButton);
            }
        });
    });

    // Shuffle and repeat
    const shuffleButton = document.querySelector(".shuffle-btn");
    const repeatButton = document.querySelector(".repeat-btn");

    shuffleButton?.addEventListener("click", event => {
        event.stopPropagation();

        isShuffleOn = !isShuffleOn;
        shuffleButton.classList.toggle("active", isShuffleOn);
    });

    repeatButton?.addEventListener("click", event => {
        event.stopPropagation();

        isRepeatOn = !isRepeatOn;
        repeatButton.classList.toggle("active", isRepeatOn);
    });

    function getRandomPlaylistIndex() {
        if (currentPlaylist.length <= 1) {
            return currentIndex;
        }

        let randomIndex;

        do {
            randomIndex = Math.floor(Math.random() * currentPlaylist.length);
        } while (randomIndex === currentIndex);

        return randomIndex;
    }

    // Main playback controls
    if (controlButtons.length >= 3) {
        controlButtons[0].addEventListener("click", event => {
            event.stopPropagation();

            if (!currentPlaylist.length) {
                if (audio.src) {
                    audio.currentTime = 0;
                }

                return;
            }

            if (audio.currentTime > 3) {
                audio.currentTime = 0;
                return;
            }

            if (currentIndex > 0) {
                currentIndex--;
                loadSong(currentPlaylist[currentIndex]);
                playAudio();
            }
        });

        controlButtons[1].addEventListener("click", event => {
            event.stopPropagation();

            if (!audio.src) {
                return;
            }

            audio.paused ? playAudio() : pauseAudio();
        });

        controlButtons[2].addEventListener("click", event => {
            event.stopPropagation();

            if (!currentPlaylist.length) {
                return;
            }

            if (isShuffleOn) {
                currentIndex = getRandomPlaylistIndex();
            } else if (currentIndex >= currentPlaylist.length - 1) {
                audio.pause();
                audio.currentTime = 0;

                setPlayState(false);
                currentPlaylist = [];
                currentIndex = 0;
                currentButton = null;

                return;
            } else {
                currentIndex++;
            }

            loadSong(currentPlaylist[currentIndex]);
            playAudio();
        });
    }

    audio.addEventListener("ended", () => {
        if (isRepeatOn) {
            audio.currentTime = 0;
            playAudio();
            return;
        }

        if (!autoplayEnabled || !currentPlaylist.length) {
            setPlayState(false);
            currentButton = null;
            return;
        }

        currentIndex = isShuffleOn
            ? getRandomPlaylistIndex()
            : currentIndex + 1;

        if (currentIndex < currentPlaylist.length) {
            loadSong(currentPlaylist[currentIndex]);
            playAudio();
            return;
        }

        currentPlaylist = [];
        currentIndex = 0;
        currentButton = null;
        setPlayState(false);
    });

    // Seekbar
    audio.addEventListener("loadedmetadata", () => {
        if (!seekbar) {
            return;
        }

        seekbar.max = Number.isFinite(audio.duration) ? audio.duration : 0;
        seekbar.value = 0;

        if (durationDisplay) {
            durationDisplay.textContent = formatTime(audio.duration);
        }

        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = "0:00";
        }
    });

    audio.addEventListener("timeupdate", () => {
        if (!seekbar) {
            return;
        }

        seekbar.value = audio.currentTime;

        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = formatTime(audio.currentTime);
        }
    });

    seekbar?.addEventListener("input", event => {
        event.stopPropagation();

        if (Number.isFinite(audio.duration)) {
            audio.currentTime = Number(seekbar.value);
        }
    });

    // Volume
    if (volumeSlider) {
        audio.volume = Number(volumeSlider.value) / 100;

        volumeSlider.addEventListener("input", event => {
            event.stopPropagation();
            audio.volume = Number(volumeSlider.value) / 100;
        });
    }


    // Saved Songs / Library
    function renderSavedSongs() {
        const savedSongsCount = document.querySelector(".saved-songs-count");

        if (savedSongsCount) {
            savedSongsCount.textContent = getSavedSongs().length;
        }
    }

    function openLikedSongs() {
        if (!likedSongsOverlay) return;

        renderLikedSongsPage();
        likedSongsOverlay.classList.add("active");
    }

    function closeLikedSongs() {
        likedSongsOverlay?.classList.remove("active");
    }

    function playSongList(songs, index = 0) {
        if (!Array.isArray(songs) || !songs.length) return;
        if (index < 0 || index >= songs.length) return;

        currentPlaylist = songs.map(song => ({
            ...song,
            sourceButton: null
        }));

        currentIndex = index;
        currentButton = null;

        loadSong(currentPlaylist[currentIndex]);
        playAudio();
    }

    function renderLikedSongsPage() {
        if (!likedSongsPageList) return;

        const likedSongs = getSavedSongs();

        if (likedSongsPageCount) {
            likedSongsPageCount.textContent = `${likedSongs.length} songs`;
        }

        likedSongsPageList.replaceChildren();

        if (!likedSongs.length) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "liked-songs-empty-page";
            emptyMessage.textContent = "Songs you like will appear here.";

            likedSongsPageList.appendChild(emptyMessage);
            return;
        }

        likedSongs.forEach((song, index) => {
            const songElement = document.createElement("div");
            songElement.className = "liked-song-page-item";

            const image = document.createElement("img");
            image.className = "liked-song-page-image";
            image.src = song.image || "";
            image.alt = "";
            image.loading = "lazy";

            const info = document.createElement("div");
            info.className = "liked-song-page-info";

            const title = document.createElement("h4");
            title.textContent = song.title || "Unknown song";

            const artist = document.createElement("p");
            artist.textContent = song.artist || "Unknown artist";

            info.append(title, artist);
            songElement.append(image, info);

            songElement.addEventListener("click", () => {
                playSongList(getSavedSongs(), index);
            });

            likedSongsPageList.appendChild(songElement);
        });
    }

    renderSavedSongs();

    likeButton?.addEventListener("click", event => {
        event.stopPropagation();

        if (!currentSong?.audio) return;

        const likedSongs = getSavedSongs();
        const songIndex = likedSongs.findIndex(
            song => song.audio === currentSong.audio
        );

        if (songIndex === -1) {
            likedSongs.push({
                audio: currentSong.audio,
                title: currentSong.title || "",
                artist: currentSong.artist || "",
                image: currentSong.image || ""
            });
        } else {
            likedSongs.splice(songIndex, 1);
        }

        saveSongs(likedSongs);
        updateLikeButton();
        renderSavedSongs();
        renderLikedSongsPage();
    });

    // Expanded Player
    bottomPlayer?.addEventListener("click", event => {
        if (!bottomPlayer.classList.contains("has-song")) return;
        if (bottomPlayer.classList.contains("expanded")) return;
        if (event.target.closest("button, input, a")) return;

        bottomPlayer.classList.add("expanded");
    });

    collapsePlayer?.addEventListener("click", event => {
        event.stopPropagation();
        bottomPlayer?.classList.remove("expanded");
    });

    // Player Menu
    const menuActions = document.querySelectorAll(".menu-action");

    playerMenu?.addEventListener("click", event => {
        event.stopPropagation();
        bottomPlayer?.classList.toggle("menu-open");
    });

    function shareCurrentSong(action) {
        if (!currentSong) return;

        const shareData = {
            title: currentSong.title || "Spotify Clone",
            text: `${currentSong.title || "Unknown song"} - ${currentSong.artist || "Unknown artist"}`
        };

        if (navigator.share) {
            navigator.share(shareData).catch(error => {
                if (error.name !== "AbortError") {
                    console.error("Sharing failed:", error);
                }
            });
            return;
        }

        if (!navigator.clipboard?.writeText) {
            showSpotifyToast("Sharing is not supported in this browser.");
            return;
        }

        navigator.clipboard.writeText(shareData.text)
            .then(() => {
                if (action) action.textContent = "Copied to clipboard";
            })
            .catch(() => {
                showSpotifyToast("Unable to copy song details.");
            });
    }

    menuActions.forEach(action => {
        action.addEventListener("click", event => {
            event.stopPropagation();

            if (!currentSong) {
                showSpotifyToast("Play a song first.");
                return;
            }

            const actionType = action.dataset.action;
            const originalLabel = action.textContent;

            if (actionType === "playlist") {
                bottomPlayer?.classList.remove("menu-open");
                openAddToPlaylistMenu(currentSong);
                return;
            }

            if (actionType === "queue") {
                const alreadyQueued = currentPlaylist.some(
                    song => song.audio === currentSong.audio
                );

                if (!currentPlaylist.length) {
                    currentPlaylist = [currentSong];
                    currentIndex = 0;
                } else if (!alreadyQueued) {
                    currentPlaylist.push(currentSong);
                }

                action.textContent = alreadyQueued
                    ? "Already in queue"
                    : "Added to queue";
            } else if (actionType === "share") {
                shareCurrentSong(action);
            } else if (actionType === "copy") {
                if (!currentSong.audio || !navigator.clipboard?.writeText) {
                    showSpotifyToast("Copy is not supported in this browser.");
                    return;
                }

                navigator.clipboard.writeText(currentSong.audio)
                    .then(() => {
                        action.textContent = "Song path copied";
                    })
                    .catch(() => {
                        showSpotifyToast("Unable to copy song path.");
                    });
            } else if (actionType === "artwork") {
                if (!currentSong.image) return;

                window.open(
                    currentSong.image,
                    "_blank",
                    "noopener,noreferrer"
                );
            }

            bottomPlayer?.classList.remove("menu-open");

            window.setTimeout(() => {
                if (action.isConnected) {
                    action.textContent = originalLabel;
                }
            }, 1500);
        });
    });

    document.addEventListener("click", event => {
        if (
            bottomPlayer &&
            playerMenuWrapper &&
            !playerMenuWrapper.contains(event.target)
        ) {
            bottomPlayer.classList.remove("menu-open");
        }
    });

    deviceButton?.addEventListener("click", event => {
        event.stopPropagation();
        showSpotifyToast("Device selection is not available yet.");
    });

    shareButton?.addEventListener("click", event => {
        event.stopPropagation();

        if (!currentSong) {
            showSpotifyToast("Play a song first.");
            return;
        }

        shareCurrentSong(shareButton);
    });

    // Mobile Navigation
    searchButton?.addEventListener("click", () => {
        document.body.classList.remove("library-view");
        document.body.classList.add("mobile-search-active");

        homeButton?.classList.remove("active");
        libraryButton?.classList.remove("active");

        mobileSearchInput?.focus();
    });

    libraryButton?.addEventListener("click", () => {
        document.body.classList.add("library-view");
        document.body.classList.remove("mobile-search-active");

        renderSavedSongs();

        if (mobilePageTitle) {
            mobilePageTitle.textContent = "Your Library";
        }

        homeButton?.classList.remove("active");
        libraryButton.classList.add("active");
    });

    homeButton?.addEventListener("click", () => {
        document.body.classList.remove("library-view", "mobile-search-active");

        if (mobileSearchInput) {
            mobileSearchInput.value = "";
        }

        runSearch("");

        if (mobilePageTitle) {
            mobilePageTitle.textContent = "Good morning";
        }

        libraryButton?.classList.remove("active");
        homeButton.classList.add("active");
    });

    // Settings
    function updateSettingsUI() {
        if (autoplayValue) {
            autoplayValue.textContent = autoplayEnabled ? "On" : "Off";
        }

        if (audioQualityValue) {
            audioQualityValue.textContent = selectedAudioQuality;
        }

        if (dataToggle) {
            dataToggle.parentElement?.classList.toggle(
                "data-active",
                dataSaverEnabled
            );
        }

        if (notificationValue) {
            notificationValue.textContent =
                typeof Notification !== "undefined" &&
                    Notification.permission === "granted"
                    ? "On"
                    : "Off";
        }

        if (themeValue) {
            themeValue.textContent = lightTheme ? "Light" : "Dark";
        }
    }

    function applyTheme() {
        document.body.classList.toggle("light-theme", lightTheme);
    }

    function applyDataSaver() {
        audio.preload = dataSaverEnabled ? "none" : "auto";

        document.querySelectorAll("img").forEach(img => {
            if (img.closest(".header, .bottom-player")) return;

            img.loading = dataSaverEnabled ? "lazy" : "eager";
        });
    }

    mobileSettings?.addEventListener("click", event => {
        event.stopPropagation();

        settingsWrapper?.classList.toggle("settings-open");
        updateSettingsUI();
    });

    async function handleNotifications() {
        if (!("Notification" in window)) {
            alert("Your browser does not support notifications.");
            return;
        }

        if (Notification.permission === "default") {
            try {
                const permission = await Notification.requestPermission();

                if (permission === "granted") {
                    new Notification("Spotify Clone", {
                        body: "Notifications are now enabled."
                    });
                }
            } catch (error) {
                console.error("Notification permission error:", error);
            }

            return;
        }

        if (Notification.permission === "granted") {
            new Notification("Spotify Clone", {
                body: "Notifications are already enabled."
            });
            return;
        }

        alert(
            "Notifications are blocked in your browser. Enable them from site settings."
        );
    }

    settingsOptions.forEach(option => {
        option.addEventListener("click", async event => {
            event.stopPropagation();

            const setting = option.dataset.setting;

            try {
                switch (setting) {
                    case "account": {
                        const currentName =
                            localStorage.getItem("spotifyUserName") || "Spotify User";

                        const newName = prompt(
                            "Enter your display name:",
                            currentName
                        );

                        if (newName === null) break;

                        const trimmedName = newName.trim();

                        if (!trimmedName) break;

                        localStorage.setItem("spotifyUserName", trimmedName);
                        showSpotifyToast(`Account name changed to "${trimmedName}"`);
                        break;
                    }

                    case "playback":
                        autoplayEnabled = !autoplayEnabled;
                        localStorage.setItem("spotifyAutoplay", String(autoplayEnabled));
                        updateSettingsUI();
                        break;

                    case "audio": {
                        const qualities = ["Low", "Normal", "High"];
                        const index = qualities.indexOf(selectedAudioQuality);

                        selectedAudioQuality =
                            qualities[(index + 1) % qualities.length];

                        localStorage.setItem(
                            "spotifyAudioQuality",
                            selectedAudioQuality
                        );

                        updateSettingsUI();
                        break;
                    }

                    case "data":
                        dataSaverEnabled = !dataSaverEnabled;
                        localStorage.setItem(
                            "spotifyDataSaver",
                            String(dataSaverEnabled)
                        );

                        applyDataSaver();
                        updateSettingsUI();
                        break;

                    case "notifications":
                        await handleNotifications();
                        updateSettingsUI();
                        break;

                    case "theme":
                        lightTheme = !lightTheme;

                        localStorage.setItem(
                            "spotifyTheme",
                            lightTheme ? "light" : "dark"
                        );

                        applyTheme();
                        updateSettingsUI();
                        break;

                    case "logout":
                        alert("This demo does not have a real login system.");
                        break;
                }
            } catch (error) {
                console.error("Settings update failed:", error);
                showSpotifyToast("Unable to update this setting.");
            }
        });
    });

    document.addEventListener("click", event => {
        if (
            settingsWrapper &&
            !settingsWrapper.contains(event.target)
        ) {
            settingsWrapper.classList.remove("settings-open");
        }
    });

    applyTheme();
    applyDataSaver();
    updateSettingsUI();



    // Playlist System
    const createPlaylistButtons = document.querySelectorAll(
        ".createPlaylistButton, .yourLibrary > button"
    );

    const playlistModalOverlay = document.querySelector(".playlist-modal-overlay");
    const playlistModalClose = document.querySelector(".playlist-modal-close");
    const playlistCancel = document.querySelector(".playlist-cancel");
    const playlistCreate = document.querySelector(".playlist-create");
    const playlistNameInput = document.querySelector(".playlist-name-input");
    const userPlaylists = document.querySelector(".user-playlists");
    const playlistEmptyState = document.querySelector(".playlist");

    const playlistDetailOverlay = document.querySelector("#playlist-detail-overlay");
    const playlistDetailName = document.querySelector("#playlist-detail-name");
    const playlistDetailCount = document.querySelector("#playlist-detail-count");
    const playlistDetailSongs = document.querySelector("#playlist-detail-songs");
    const playlistBack = document.querySelector(".playlist-back");
    const playlistDetailPlay = document.querySelector(".playlist-detail-play");

    const addPlaylistOverlay = document.querySelector("#add-playlist-overlay");
    const addPlaylistList = document.querySelector("#add-playlist-list");
    const addPlaylistClose = document.querySelector(".add-playlist-close");
    const createPlaylistFromPlayer = document.querySelector(".create-playlist-from-player");

    const browsePodcastButton = document.querySelector(".browsePodcastButton");
    const spotifyToast = document.querySelector("#spotify-toast");

    const likedSongsOverlay = document.querySelector("#liked-songs-overlay");
    const likedSongsPageList = document.querySelector("#liked-songs-page-list");
    const likedSongsPageCount = document.querySelector("#liked-songs-page-count");
    const likedSongsBack = document.querySelector(".liked-songs-back");
    const likedSongsPlay = document.querySelector(".liked-songs-play");
    const likedSongsLibraryCard = document.querySelector("#liked-songs-library-card");

    if (likedSongsLibraryCard) {
        likedSongsLibraryCard.addEventListener("click", event => {
            event.stopPropagation();
            openLikedSongs();
        });
    }

    if (likedSongsBack) {
        likedSongsBack.addEventListener("click", event => {
            event.stopPropagation();
            closeLikedSongs();
        });
    }

    if (likedSongsPlay) {
        likedSongsPlay.addEventListener("click", event => {
            event.stopPropagation();

            const likedSongs = getSavedSongs();
            if (!likedSongs.length) return;

            currentPlaylist = likedSongs.map(song => ({
                ...song,
                sourceButton: null
            }));

            currentIndex = 0;
            currentButton = null;

            loadSong(currentPlaylist[0]);
            playAudio();
        });
    }

    let userPlaylistData = [];

    try {
        const storedPlaylists = JSON.parse(
            localStorage.getItem("spotifyPlaylists") || "[]"
        );

        if (Array.isArray(storedPlaylists)) {
            userPlaylistData = storedPlaylists
                .filter(playlist =>
                    playlist &&
                    (typeof playlist.id === "number" || typeof playlist.id === "string") &&
                    typeof playlist.name === "string"
                )
                .map(playlist => ({
                    id: playlist.id,
                    name: playlist.name,
                    color: typeof playlist.color === "string"
                        ? playlist.color
                        : "",
                    songs: Array.isArray(playlist.songs)
                        ? playlist.songs.filter(song =>
                            song && typeof song === "object"
                        )
                        : []
                }));
        }
    } catch {
        userPlaylistData = [];
    }

    let openedPlaylist = null;
    let songToAddAfterPlaylistCreation = null;
    let songToAddToPlaylist = null;
    let toastTimeout;

    function savePlaylists() {
        try {
            localStorage.setItem(
                "spotifyPlaylists",
                JSON.stringify(userPlaylistData)
            );
        } catch {
            showSpotifyToast("Couldn't save playlists. Storage may be full.");
        }
    }

    function randomColor() {
        const letters = "0123456789ABCDEF";
        let color = "#";

        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * letters.length)];
        }

        return color;
    }

    function generatePlaylistBackground() {
        if (Math.random() < 0.5) {
            return randomColor();
        }

        return `linear-gradient(135deg, ${randomColor()}, ${randomColor()}, ${randomColor()})`;
    }

    function isValidPlaylistBackground(value) {
        if (typeof value !== "string") return false;

        const hexColor = /^#[0-9a-fA-F]{6}$/;
        const gradient = /^linear-gradient\(135deg,\s*#[0-9a-fA-F]{6},\s*#[0-9a-fA-F]{6},\s*#[0-9a-fA-F]{6}\)$/;

        return hexColor.test(value.trim()) || gradient.test(value.trim());
    }

    function getPlaylistBackground(playlist) {
        if (isValidPlaylistBackground(playlist.color)) {
            return playlist.color;
        }

        playlist.color = generatePlaylistBackground();
        return playlist.color;
    }

    function showSpotifyToast(message = "This feature isn't available yet.") {
        if (!spotifyToast) return;

        spotifyToast.textContent = message;
        spotifyToast.classList.add("show");

        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            spotifyToast.classList.remove("show");
        }, 3000);
    }

    function openPlaylistModal() {
        if (!playlistModalOverlay) return;

        playlistModalOverlay.classList.add("active");

        if (playlistNameInput) {
            playlistNameInput.value = "";

            setTimeout(() => {
                playlistNameInput.focus();
            }, 100);
        }
    }

    function closePlaylistModal() {
        playlistModalOverlay?.classList.remove("active");
    }

    function renderUserPlaylists() {
        if (!userPlaylists) return;

        userPlaylists.replaceChildren();

        if (!userPlaylistData.length) {
            if (playlistEmptyState) {
                playlistEmptyState.style.display = "";
            }

            return;
        }

        if (playlistEmptyState) {
            playlistEmptyState.style.display = "none";
        }

        userPlaylistData.forEach(playlist => {
            const playlistElement = document.createElement("div");
            playlistElement.className = "user-playlist";
            playlistElement.dataset.playlistId = String(playlist.id);

            const image = document.createElement("div");
            image.className = "user-playlist-image";
            image.style.background = getPlaylistBackground(playlist);

            const info = document.createElement("div");
            info.className = "user-playlist-info";

            const name = document.createElement("h4");
            name.textContent = playlist.name;

            const description = document.createElement("p");
            description.textContent = `Playlist • ${playlist.songs.length} songs`;

            info.append(name, description);
            playlistElement.append(image, info);
            userPlaylists.appendChild(playlistElement);
        });

        savePlaylists();
    }

    function createPlaylist() {
        if (!playlistNameInput) return;

        const playlistName = playlistNameInput.value.trim();

        if (!playlistName) {
            playlistNameInput.focus();
            return;
        }

        const alreadyExists = userPlaylistData.some(
            playlist => playlist.name.toLowerCase() === playlistName.toLowerCase()
        );

        if (alreadyExists) {
            alert("A playlist with this name already exists.");
            playlistNameInput.focus();
            return;
        }

        const newPlaylist = {
            id: Date.now(),
            name: playlistName,
            color: generatePlaylistBackground(),
            songs: []
        };

        if (songToAddAfterPlaylistCreation) {
            const song = songToAddAfterPlaylistCreation;

            newPlaylist.songs.push({
                audio: song.audio,
                title: song.title,
                artist: song.artist,
                image: song.image
            });
        }

        userPlaylistData.push(newPlaylist);

        savePlaylists();
        renderUserPlaylists();

        const addedSong = songToAddAfterPlaylistCreation;
        songToAddAfterPlaylistCreation = null;

        closePlaylistModal();

        if (addedSong) {
            closeAddToPlaylistMenu();

            showSpotifyToast(
                `"${addedSong.title}" added to "${newPlaylist.name}"`
            );
        } else {
            showSpotifyToast(`Playlist "${newPlaylist.name}" created.`);
        }
    }

    createPlaylistButtons.forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            songToAddAfterPlaylistCreation = null;
            openPlaylistModal();
        });
    });

    playlistModalClose?.addEventListener("click", closePlaylistModal);
    playlistCancel?.addEventListener("click", closePlaylistModal);
    playlistCreate?.addEventListener("click", createPlaylist);

    playlistNameInput?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            createPlaylist();
        }

        if (event.key === "Escape") {
            closePlaylistModal();
        }
    });

    playlistModalOverlay?.addEventListener("click", event => {
        if (event.target === playlistModalOverlay) {
            closePlaylistModal();
        }
    });

    // Playlist Details
    function openPlaylist(playlist) {
        if (!playlistDetailOverlay) return;

        openedPlaylist = playlist;

        playlistDetailOverlay.style.setProperty(
            "--playlist-detail-bg",
            getPlaylistBackground(playlist)
        );

        if (playlistDetailName) {
            playlistDetailName.textContent = playlist.name;
        }

        if (playlistDetailCount) {
            playlistDetailCount.textContent = `${playlist.songs.length} songs`;
        }

        renderPlaylistSongs();
        playlistDetailOverlay.classList.add("active");
    }

    function closePlaylist() {
        playlistDetailOverlay?.classList.remove("active");
        openedPlaylist = null;
    }

    function renderPlaylistSongs() {
        if (!playlistDetailSongs) return;

        playlistDetailSongs.replaceChildren();

        if (!openedPlaylist || !openedPlaylist.songs.length) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "playlist-empty-message";
            emptyMessage.textContent = "This playlist is empty.";
            playlistDetailSongs.appendChild(emptyMessage);
            return;
        }

        openedPlaylist.songs.forEach((song, index) => {
            const songElement = document.createElement("div");
            songElement.className = "playlist-song";

            const image = document.createElement("img");
            image.className = "playlist-song-image";
            image.src = song.image || "";
            image.alt = "";
            image.loading = "lazy";

            const info = document.createElement("div");
            info.className = "playlist-song-info";

            const title = document.createElement("h4");
            title.textContent = song.title || "Unknown song";

            const artist = document.createElement("p");
            artist.textContent = song.artist || "Unknown artist";

            info.append(title, artist);
            songElement.append(image, info);

            songElement.addEventListener("click", () => {
                if (!openedPlaylist) return;

                currentPlaylist = openedPlaylist.songs.map(playlistSong => ({
                    ...playlistSong
                }));

                currentIndex = index;
                currentButton = null;

                loadSong(currentPlaylist[currentIndex]);
                playAudio();
            });

            playlistDetailSongs.appendChild(songElement);
        });
    }

    userPlaylists?.addEventListener("click", event => {
        const playlistElement = event.target.closest(".user-playlist");
        if (!playlistElement) return;

        const playlistId = playlistElement.dataset.playlistId;

        const playlist = userPlaylistData.find(
            item => String(item.id) === String(playlistId)
        );

        if (playlist) {
            openPlaylist(playlist);
        }
    });

    playlistBack?.addEventListener("click", closePlaylist);

    playlistDetailPlay?.addEventListener("click", () => {
        if (!openedPlaylist || !openedPlaylist.songs.length) return;

        currentPlaylist = openedPlaylist.songs.map(song => ({
            ...song
        }));

        currentIndex = 0;
        currentButton = null;

        loadSong(currentPlaylist[0]);
        playAudio();
    });

    // Add Song To Playlist
    function openAddToPlaylistMenu(song) {
        if (!addPlaylistOverlay) return;

        songToAddToPlaylist = song;
        renderPlaylistSelector();
        addPlaylistOverlay.classList.add("active");
    }

    function closeAddToPlaylistMenu() {
        addPlaylistOverlay?.classList.remove("active");
        songToAddToPlaylist = null;
    }

    function renderPlaylistSelector() {
        if (!addPlaylistList) return;

        addPlaylistList.replaceChildren();

        if (!userPlaylistData.length) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "playlist-empty-message";
            emptyMessage.textContent = "You haven't created any playlists yet.";
            addPlaylistList.appendChild(emptyMessage);
            return;
        }

        userPlaylistData.forEach(playlist => {
            const button = document.createElement("button");
            button.className = "add-playlist-item";
            button.type = "button";

            const color = document.createElement("div");
            color.className = "add-playlist-color";
            color.style.background = getPlaylistBackground(playlist);

            const name = document.createElement("span");
            name.className = "add-playlist-name";
            name.textContent = playlist.name;

            button.append(color, name);

            button.addEventListener("click", () => {
                addSongToPlaylist(playlist.id);
            });

            addPlaylistList.appendChild(button);
        });
    }

    function addSongToPlaylist(playlistId) {
        if (!songToAddToPlaylist) return;

        const playlist = userPlaylistData.find(
            item => String(item.id) === String(playlistId)
        );

        if (!playlist) return;

        const alreadyExists = playlist.songs.some(
            song => song.audio === songToAddToPlaylist.audio
        );

        if (alreadyExists) {
            alert(
                `"${songToAddToPlaylist.title}" is already in "${playlist.name}".`
            );
            return;
        }

        playlist.songs.push({
            audio: songToAddToPlaylist.audio,
            title: songToAddToPlaylist.title,
            artist: songToAddToPlaylist.artist,
            image: songToAddToPlaylist.image
        });

        savePlaylists();
        renderUserPlaylists();

        if (openedPlaylist && String(openedPlaylist.id) === String(playlist.id)) {
            openedPlaylist = playlist;
            renderPlaylistSongs();

            if (playlistDetailCount) {
                playlistDetailCount.textContent = `${playlist.songs.length} songs`;
            }
        }

        const songTitle = songToAddToPlaylist.title;
        closeAddToPlaylistMenu();

        showSpotifyToast(`"${songTitle}" added to "${playlist.name}"`);
    }

    addPlaylistClose?.addEventListener("click", closeAddToPlaylistMenu);

    addPlaylistOverlay?.addEventListener("click", event => {
        if (event.target === addPlaylistOverlay) {
            closeAddToPlaylistMenu();
        }
    });

    createPlaylistFromPlayer?.addEventListener("click", () => {
        if (!songToAddToPlaylist) return;

        songToAddAfterPlaylistCreation = songToAddToPlaylist;
        closeAddToPlaylistMenu();
        openPlaylistModal();
    });

    // Podcast
    browsePodcastButton?.addEventListener("click", event => {
        event.stopPropagation();
        showSpotifyToast("Podcast browsing is not available yet.");
    });

    renderUserPlaylists();
});
