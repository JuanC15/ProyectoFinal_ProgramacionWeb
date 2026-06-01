import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../Firebase/Config'
import './Login.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      window.location.hash = '#/dashboard'
    } catch {
      setError('No fue posible iniciar sesión. Revisa tu correo y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='auth-page'>
      <section className='auth-card'>
        <h1>Iniciar sesión</h1>
        <p>Accede con tu cuenta para reportar y dar seguimiento a incidentes.</p>

        <form className='auth-form' onSubmit={handleSubmit}>
          <label>
            Correo electrónico
            <input
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder='usuario@correo.com'
              required
            />
          </label>

          <label>
            Contraseña
            <div className='password-field'>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder='Tu contraseña'
                required
              />

              <button
                type='button'
                className='password-toggle'
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {error ? <p className='auth-error'>{error}</p> : null}

          <button className='btn btn-primary' type='submit' disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <a className='auth-link' href='#/register'>No tienes cuenta? Regístrate</a>
      </section>
    </main>
  )
}

export default Login