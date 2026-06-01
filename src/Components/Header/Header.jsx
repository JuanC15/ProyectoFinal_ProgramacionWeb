import React, { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../Firebase/Config'
import './Header.css'

const Header = () => {
  const [user, setUser] = useState(null)
  const [rol, setRol] = useState('Usuario')
  const [openMenu, setOpenMenu] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        try {
          const userRef = doc(db, 'usuarios', currentUser.uid)
          const userSnap = await getDoc(userRef)

          if (userSnap.exists()) {
            const data = userSnap.data()
            setRol(data.rol || 'Usuario')
          } else {
            setRol('Usuario')
          }
        } catch (error) {
          console.error('Error obteniendo rol:', error)
          setRol('Usuario')
        }
      } else {
        setRol('Usuario')
      }
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setOpenMenu(false)
      window.location.hash = '#/'
    } catch (error) {
      console.error('Error cerrando sesión:', error)
    }
  }

  const goToDashboard = () => {
    setOpenMenu(false)
    window.location.hash = '#/dashboard'
  }

  return (
    <header className='header'>
      <div className='header-left'>
        <a className='logoHeader' href='#/'>
          <img src='/logo.png' alt='Logo Uniamazonia' />
        </a>

        <div className='titulo'>
          <h1>Sistema de Reporte de Incidentes Uniamazonia</h1>
          <p>¡Tu voz, nuestra acción para una comunidad más segura!</p>
        </div>
      </div>

      {!user ? (
        <div className='botones-sesion'>
          <a className='btn inicio-sesion' href='#/login'>
            Iniciar sesión
          </a>

          <a className='btn registro' href='#/register'>
            Registrarse
          </a>
        </div>
      ) : (
        <div className='usuario-menu'>
          <button
            className='usuario-btn'
            type='button'
            onClick={() => setOpenMenu(!openMenu)}
          >
            <span className='usuario-avatar'>
              {user.email?.charAt(0).toUpperCase()}
            </span>

            <div className='usuario-info-header'>
              <span className='usuario-correo'>{user.email}</span>
              <small>{rol}</small>
            </div>

            <span className='usuario-flecha'>▾</span>
          </button>

          {openMenu && (
            <div className='usuario-dropdown'>
              <p className='dropdown-label'>Sesión iniciada como</p>
              <strong>{user.email}</strong>

              <div className='user-role-box'>
                <span>Tipo de usuario</span>
                <strong>{rol}</strong>
              </div>

              <button type='button' onClick={goToDashboard}>
                Ir al panel
              </button>

              <button
                type='button'
                className='logout-option'
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default Header