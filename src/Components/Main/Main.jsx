import React, { useEffect, useRef, useState } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './Main.css'

const Main = () => {
  const audioRef = useRef(null)
  const [soundOn, setSoundOn] = useState(false)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [birdsFlying, setBirdsFlying] = useState(true)
  const [flyKey, setFlyKey] = useState(1)

  useEffect(() => {
    AOS.init({
      duration: 1000,
      easing: 'ease-out-cubic',
      once: true
    })
  }, [])

  const iniciarSonido = async () => {
    const audio = audioRef.current

    if (!audio) return

    try {
      audio.currentTime = 0
      audio.volume = 0.45
      await audio.play()
      setSoundOn(true)
      setAudioBlocked(false)
    } catch (error) {
      console.log('Audio bloqueado:', error)
      setAudioBlocked(true)
      setSoundOn(false)
    }
  }

  const detenerSonido = () => {
    const audio = audioRef.current

    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    setSoundOn(false)
  }

  useEffect(() => {
    setBirdsFlying(true)

    const intentarSonidoAutomatico = async () => {
      await iniciarSonido()
    }

    intentarSonidoAutomatico()

    const activarSonidoPrimerClick = async () => {
      if (!soundOn) {
        await iniciarSonido()
      }

      window.removeEventListener('click', activarSonidoPrimerClick)
    }

    window.addEventListener('click', activarSonidoPrimerClick)

    const stopTimer = setTimeout(() => {
      setBirdsFlying(false)
      detenerSonido()
    }, 10500)

    return () => {
      clearTimeout(stopTimer)
      window.removeEventListener('click', activarSonidoPrimerClick)
      detenerSonido()
    }
  }, [flyKey])

  const toggleSound = async () => {
    if (soundOn) {
      detenerSonido()
    } else {
      await iniciarSonido()
    }
  }

  const repetirTucanes = async () => {
    setBirdsFlying(false)
    detenerSonido()

    setTimeout(async () => {
      setFlyKey((prev) => prev + 1)
      setBirdsFlying(true)
      await iniciarSonido()
    }, 150)
  }

  return (
    <main className='inicio-campus'>
      <audio ref={audioRef} loop preload='auto'>
        <source src='/sounds/naturaleza-pajaros.mp3' type='audio/mpeg' />
        Tu navegador no soporta audio.
      </audio>

      <div className='sun-light'></div>
      <div className='forest-depth'></div>

      <div className='corner-leaves leaves-left'></div>
      <div className='corner-leaves leaves-right'></div>

      {birdsFlying && (
        <div className='toucan-flock' key={flyKey} aria-hidden='true'>
          <span className='toucan toucan-1'></span>
          <span className='toucan toucan-2'></span>
          <span className='toucan toucan-3'></span>
          <span className='toucan toucan-4'></span>
          <span className='toucan toucan-5'></span>
        </div>
      )}

      <div className='toucan-scene'>
        <div className='toucan-body'></div>
      </div>

      <aside className='floating-tools'>
        <button
          type='button'
          className='mini-tool'
          onClick={repetirTucanes}
          title='Repetir tucanes'
        >
          🦜
        </button>

        <button
          type='button'
          className={soundOn ? 'mini-tool active' : 'mini-tool'}
          onClick={toggleSound}
          title={soundOn ? 'Pausar sonido' : 'Activar sonido'}
        >
          {soundOn ? '🔊' : '🔈'}
        </button>
      </aside>

      <section className='inicio-content' data-aos='fade-right'>
        <span className='inicio-badge'>Universidad de la Amazonia</span>

        <h1>
          Sistema de Reporte de Incidentes
        </h1>

        <p>
          Reporta incidentes dentro de la institución de forma rápida, organizada
          y segura. Adjunta evidencia fotográfica, registra la ubicación y consulta
          el estado de atención desde el panel.
        </p>

        <div className='inicio-actions'>
          <a href='#/login' className='inicio-btn primary'>
            <span className='btn-icon'>📄</span>
            Reportar incidente
          </a>

          <a href='#/consulta-incidentes' className='inicio-btn secondary'>
            <span className='btn-icon'>🔍</span>
            Consultar estado
          </a>

          <button
            type='button'
            className={soundOn ? 'inicio-btn sound active' : 'inicio-btn sound'}
            onClick={toggleSound}
          >
            {soundOn ? 'Pausar naturaleza' : 'Activar naturaleza'}
          </button>
        </div>

        {audioBlocked && (
          <p className='audio-warning'>
            El navegador bloqueó el sonido automático. Usa el ícono de sonido
            del lado derecho o haz clic en cualquier parte de la página para activarlo.
          </p>
        )}
      </section>

      <section className='inicio-info' data-aos='fade-up'>
        <article>
          <span>📸</span>
          <h3>Evidencia</h3>
          <p>Adjunta una imagen del incidente reportado.</p>
        </article>

        <article>
          <span>📍</span>
          <h3>Ubicación</h3>
          <p>Indica el bloque, salón, laboratorio o área afectada.</p>
        </article>

        <article>
          <span>🔔</span>
          <h3>Seguimiento</h3>
          <p>Consulta el estado del reporte y recibe avisos cuando cambie.</p>
        </article>
      </section>
    </main>
  )
}

export default Main