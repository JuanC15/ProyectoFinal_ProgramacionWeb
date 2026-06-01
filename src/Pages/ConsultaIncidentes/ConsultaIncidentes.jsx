import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../Firebase/Config'
import './ConsultaIncidentes.css'

const ConsultaIncidentes = () => {
  const [incidentes, setIncidentes] = useState([])
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const incidentesQuery = query(
      collection(db, 'incidentes'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(incidentesQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))

      setIncidentes(data)
      setCargando(false)
    })

    return () => unsubscribe()
  }, [])

  const incidentesFiltrados = useMemo(() => {
    if (estadoFiltro === 'Todos') {
      return incidentes
    }

    return incidentes.filter((incidente) => {
      const estado = incidente.estado || 'Reportado'
      return estado === estadoFiltro
    })
  }, [incidentes, estadoFiltro])

  const totalReportados = incidentes.filter(
    (incidente) => (incidente.estado || 'Reportado') === 'Reportado'
  ).length

  const totalProceso = incidentes.filter(
    (incidente) => incidente.estado === 'En proceso'
  ).length

  const totalResueltos = incidentes.filter(
    (incidente) => incidente.estado === 'Resuelto'
  ).length

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'

    if (fecha.seconds) {
      return new Date(fecha.seconds * 1000).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return 'Sin fecha'
  }

  const obtenerClaseEstado = (estado) => {
    const estadoFinal = estado || 'Reportado'

    if (estadoFinal === 'Resuelto') return 'estado resuelto'
    if (estadoFinal === 'En proceso') return 'estado proceso'
    return 'estado reportado'
  }

  return (
    <main className='consulta-page'>
      <section className='consulta-hero'>
        <div>
          <span className='consulta-label'>Consulta de incidentes</span>
          <h1>Incidentes registrados</h1>
          <p>
            Aquí puedes consultar los reportes realizados, filtrar por estado,
            revisar la información detallada y visualizar la imagen registrada.
          </p>
        </div>

        <div className='consulta-stats'>
          <div>
            <strong>{incidentes.length}</strong>
            <span>Total</span>
          </div>

          <div>
            <strong>{totalReportados}</strong>
            <span>Reportados</span>
          </div>

          <div>
            <strong>{totalProceso}</strong>
            <span>En proceso</span>
          </div>

          <div>
            <strong>{totalResueltos}</strong>
            <span>Resueltos</span>
          </div>
        </div>
      </section>

      <section className='consulta-panel'>
        <div className='consulta-toolbar'>
          <h2>Listado de incidencias</h2>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value='Todos'>Todos los estados</option>
            <option value='Reportado'>Reportado</option>
            <option value='En proceso'>En proceso</option>
            <option value='Resuelto'>Resuelto</option>
          </select>
        </div>

        {cargando ? (
          <div className='consulta-empty'>
            <p>Cargando incidentes...</p>
          </div>
        ) : incidentesFiltrados.length === 0 ? (
          <div className='consulta-empty'>
            <p>No hay incidentes con este estado.</p>
          </div>
        ) : (
          <div className='incidentes-grid'>
            {incidentesFiltrados.map((incidente) => (
              <article className='incidente-card' key={incidente.id}>
                <div className='incidente-img-box'>
                  {incidente.imageUrl ? (
                    <img
                      src={incidente.imageUrl}
                      alt={incidente.title || 'Imagen del incidente'}
                    />
                  ) : (
                    <div className='sin-imagen'>
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className='incidente-body'>
                  <div className='incidente-top'>
                    <span className={obtenerClaseEstado(incidente.estado)}>
                      {incidente.estado || 'Reportado'}
                    </span>

                    <small>{formatearFecha(incidente.createdAt)}</small>
                  </div>

                  <h3>{incidente.title || 'Sin título'}</h3>

                  <p>
                    {incidente.description
                      ? incidente.description.slice(0, 95)
                      : 'Sin descripción registrada'}
                    {incidente.description && incidente.description.length > 95 ? '...' : ''}
                  </p>

                  <div className='incidente-meta'>
                    <span>📍 {incidente.ubicacion || 'Sin ubicación'}</span>
                    <span>🏷️ {incidente.categoria || 'General'}</span>
                  </div>

                  <button
                    type='button'
                    onClick={() => setIncidenteSeleccionado(incidente)}
                  >
                    Ver detalle
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {incidenteSeleccionado && (
        <div className='detalle-overlay'>
          <section className='detalle-modal'>
            <button
              type='button'
              className='cerrar-detalle'
              onClick={() => setIncidenteSeleccionado(null)}
            >
              ×
            </button>

            <div className='detalle-img'>
              {incidenteSeleccionado.imageUrl ? (
                <img
                  src={incidenteSeleccionado.imageUrl}
                  alt={incidenteSeleccionado.title || 'Imagen del incidente'}
                />
              ) : (
                <div className='sin-imagen grande'>
                  Sin imagen registrada
                </div>
              )}
            </div>

            <div className='detalle-info'>
              <span className={obtenerClaseEstado(incidenteSeleccionado.estado)}>
                {incidenteSeleccionado.estado || 'Reportado'}
              </span>

              <h2>{incidenteSeleccionado.title || 'Sin título'}</h2>

              <p>{incidenteSeleccionado.description || 'Sin descripción registrada.'}</p>

              <div className='detalle-datos'>
                <div>
                  <strong>Ubicación</strong>
                  <span>{incidenteSeleccionado.ubicacion || 'Sin ubicación'}</span>
                </div>

                <div>
                  <strong>Categoría</strong>
                  <span>{incidenteSeleccionado.categoria || 'General'}</span>
                </div>

                <div>
                  <strong>Fecha</strong>
                  <span>{formatearFecha(incidenteSeleccionado.createdAt)}</span>
                </div>

                <div>
                  <strong>Usuario</strong>
                  <span>{incidenteSeleccionado.userEmail || 'No registrado'}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default ConsultaIncidentes