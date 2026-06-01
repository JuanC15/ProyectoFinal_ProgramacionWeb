import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import './App.css'
import Header from './Components/Header/Header'
import Footer from './Components/Footer/Footer'
import Main from './Components/Main/Main'
import Login from './Pages/Login/Login'
import Register from './Pages/Register/Register'
import Dashboard from './Pages/Dashboard/Dashboard'
import { auth } from './Firebase/Config'
import ConsultaIncidentes from './Pages/ConsultaIncidentes/ConsultaIncidentes'

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/')

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  let content = <Main />

  if (route === '#/dashboard' && !user) {
    content = <Login />
  } else if (route === '#/login' && user) {
    content = <Dashboard />
  } else if (route === '#/register' && user) {
    content = <Dashboard />
  } else if (route === '#/login') {
    content = <Login />
  } else if (route === '#/register') {
    content = <Register />
  } else if (route === '#/dashboard') {
    content = <Dashboard />
  }

  return (
    <>
      <Header />
      {content}
      <Footer />
    </>
  )
}

export default App
