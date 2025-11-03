<template>
  <div class="footer">
    <div class="back-to-top-container">
      <img
        class="back-to-top"
        src="@/assets/Footer/back-to-top.png"
        alt="Back to top"
        @click="moveUp"
        :style="{ opacity: updateScroll() }"
      />
      <div class="divider" :style="{ bottom: '-17px' }"></div>
    </div>
    <div class="full-container">
      <div class="top-container">
        <div class="contact-container">
          <h2>Contact-us:</h2>
          <div class="link-box">
            <a class="links-contact-container" href="mailto:42projetsweb@gmail.com">
              <img src="@/assets/Footer/email.png" alt="Email" />
            </a>
          </div>
        </div>
        <div class="logo-container">
          <div>
            <img src="@/assets/Footer/matcha.png" alt="Logo" />
          </div>
          <div class="bottom-container">
            <q-item>
              <p>
                <a href="https://profile.intra.42.fr/users/bhamdi">Bhamdi</a>
                &amp;
                <a href="https://profile.intra.42.fr/users/mbouzaie">Mbouzae</a>
                Present to you
                <a href="https://projects.intra.42.fr/projects/42cursus-matcha">MATCHA © 2023</a>
              </p>
            </q-item>
          </div>
        </div>
        <div class="follow-container">
          <div class="follow-text-container">
            <h2>Follow-us:</h2>
          </div>
          <div class="follow-links-container link-box">
            <a class="links-follow-container" href="https://www.facebook.com/42Matcha">
              <img src="@/assets/Footer/fb.png" alt="Facebook" />
            </a>
            <a class="links-follow-container" href="https://www.instagram.com/42matcha/">
              <img src="@/assets/Footer/inst.png" alt="Instagram" />
            </a>
            <a class="links-follow-container" href="https://twitter.com/42Matcha">
              <img src="@/assets/Footer/tw.png" alt="Twitter" />
            </a>
            <a class="links-follow-container" href="https://www.youtube.com/@42Matcha">
              <img src="@/assets/Footer/yt.png" alt="Youtube" />
            </a>
          </div>
        </div>
      </div>
      <div class="divider"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const scrollPosition = ref(0)

const updateScroll = () => {
  scrollPosition.value = window.scrollY
  return Math.min(scrollPosition.value / 1000, 1)
}

const moveUp = () => {
  window.scroll({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', updateScroll)
  updateScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateScroll)
})
</script>

<style scoped>
* {
  font-weight: bold;
  align-items: center;
  text-align: center;
  font-size: clamp(12px, 1em, 18px);
  max-height: fit-content;
  z-index: 10;
}

.footer,
.footer::before {
  background: linear-gradient(
    to top,
    #000 15%,
    transparent 81%,
    rgba(255, 255, 255, 0) 70%
  ) !important;
}

.back-to-top-container,
.full-container {
  position: relative;
}

.back-to-top {
  position: absolute;
  max-height: 9vh;
  min-height: 6vh;
  cursor: pointer;
  right: 23px;
  bottom: -15px;
  z-index: 1001; /* ensure on top of footer and content */
  /* white contour around PNG */
  filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff)
    drop-shadow(0 -1px 0 #fff) drop-shadow(0 0 2px rgba(255, 255, 255, 0.85));
  transition: transform 0.15s ease, filter 0.15s ease;
}

.back-to-top:disabled {
  pointer-events: none;
}

.full-container {
  width: 95vw;
  min-width: 670px;
  margin: auto;
  max-height: 30vh;
  min-height: 10vh;
}

.top-container {
  display: flex;
  flex-flow: row wrap;
  justify-content: flex-end !important;
  align-items: stretch;
}

.contact-container,
.logo-container,
.follow-container {
  flex: 1;
  width: 33.33%;
  display: flex;
}

.contact-container {
  align-items: flex-start;
  flex-direction: column;
}

.logo-container {
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
  padding: 0 20px;
}

.logo-container img {
  max-height: 11vh;
  min-height: 7vh;
  height: 50px;
  /* logo with white contour only (no hover scaling) */
  filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff)
    drop-shadow(0 -1px 0 #fff) drop-shadow(0 0 2px rgba(255, 255, 255, 0.85));
}

.follow-container {
  flex-direction: column;
  align-items: flex-end;
  font-size: clamp(14px, 1em, 20px);
  margin-left: auto;
}

.links-contact-container img,
.links-follow-container img {
  max-height: 5vh;
  min-height: 3vh;
  height: 21px;
  /* white contour for social icons */
  filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff)
    drop-shadow(0 -1px 0 #fff) drop-shadow(0 0 2px rgba(255, 255, 255, 0.85));
  transition: transform 0.15s ease, filter 0.15s ease;
}

.link-box,
.follow-text-container,
.follow-links-container,
.bottom-container {
  display: flex;
}

.follow-links-container {
  gap: 30px;
}

.bottom-container {
  font-size: clamp(16px, 1em, 22px);
  text-align: center;
}

/* White contour for footer headings and text */
.contact-container h2,
.follow-text-container h2,
.bottom-container p,
.bottom-container a {
  text-shadow: 1px 0 0 #fff, -1px 0 0 #fff, 0 1px 0 #fff, 0 -1px 0 #fff,
    0 0 2px rgba(255, 255, 255, 0.85);
  display: inline-block;
  transition: transform 0.15s ease, text-shadow 0.15s ease;
}

/* Hover enlarge, click shrink on footer icons & texts (except logo) */
.links-contact-container:hover img,
.links-follow-container:hover img,
.back-to-top:hover,
.contact-container h2:hover,
.follow-text-container h2:hover,
.bottom-container p:hover,
.bottom-container a:hover {
  transform: translateZ(0) scale(1.06);
}

.links-contact-container:active img,
.links-follow-container:active img,
.back-to-top:active,
.contact-container h2:active,
.follow-text-container h2:active,
.bottom-container p:active,
.bottom-container a:active {
  transform: translateZ(0) scale(0.94);
}

.divider {
  position: relative;
  width: 100%;
  height: 2px;
  background: rgba(128, 128, 128, 0.467);
  margin-bottom: 17px;
}
</style>
