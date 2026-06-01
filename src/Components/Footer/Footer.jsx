import React from 'react'
import './Footer.css'

const Footer = () => {
  return (
    <footer className='footer'>
      <div className='footer-content'>
        <div className='footer-text'>
          <p>Maria Alejandra Ortiz Salazar</p>
          <p>Stefanny Gisell Moreno Rivera</p>
          <p>Juan Carlos Aroca Valenzuela</p>
          <span>© 2026 UNIAMAZONIA. Todos los derechos reservados.</span>
        </div>

        <div className='footer-logo-box'>
          <img
            src='/logo.png'
            alt='Logo Uniamazonia'
            className='footer-logo'
          />
        </div>
      </div>
    </footer>
  )
}

export default Footer