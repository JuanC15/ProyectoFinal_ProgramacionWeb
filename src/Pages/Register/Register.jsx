import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../../Firebase/Config'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import './Register.css'

const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: 'user',
        createdAt: serverTimestamp()
      })

      window.location.hash = '#/dashboard'
    } catch {
      setError('No fue posible crear la cuenta. Verifica el correo y la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='auth-page'>
      <section className='auth-card'>
        <h1>Registrarse</h1>
        <p>Crea tu cuenta para empezar a reportar incidentes.</p>

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
                placeholder='Crea una contraseña'
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

          <label>
            Confirmar contraseña
            <div className='password-field'>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder='Repite la contraseña'
                required
              />

              <button
                type='button'
                className='password-toggle'
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {error ? <p className='auth-error'>{error}</p> : null}

          <button className='btn btn-primary' type='submit' disabled={loading}>
            {loading ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>

        <a className='auth-link' href='#/login'>Ya tienes cuenta? Inicia sesión</a>
      </section>
    </main>
  )
}

export default Register