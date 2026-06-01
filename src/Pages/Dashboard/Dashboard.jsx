import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../Firebase/Config'
import { supabase } from '../../Supabase/supabaseClient'
import './Dashboard.css'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: '<div class="user-location-dot"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
})

const LocationSelector = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      })
    }
  })

  return position ? (
    <Marker position={[position.lat, position.lng]} icon={markerIcon} />
  ) : null
}

const initialForm = {
  titulo: '',
  descripcion: '',
  title: '',
  description: '',
  ubicacion: '',
  zonaUniversidad: '',
  zonaOtro: '',
  categoria: 'General',
  latitud: '',
  longitud: '',
  estado: 'Reportado'
}

const Dashboard = () => {
  const [form, setForm] = useState(initialForm)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [incidentes, setIncidentes] = useState([])
  const [notificaciones, setNotificaciones] = useState([])
  const [activeTab, setActiveTab] = useState('reportar')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterCategoria, setFilterCategoria] = useState('Todas')
  const [search, setSearch] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [currentPosition, setCurrentPosition] = useState(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [detalleIncidente, setDetalleIncidente] = useState(null)

  const [rolUsuario, setRolUsuario] = useState('usuario')
  const [loadingRol, setLoadingRol] = useState(true)
  const [selectedIncidentesGrupo, setSelectedIncidentesGrupo] = useState([])
  const [updatingEstadoId, setUpdatingEstadoId] = useState('')
  const [agrupando, setAgrupando] = useState(false)
  const [periodoEstadistica, setPeriodoEstadistica] = useState('Todos')

  const bucketName = import.meta.env.VITE_SUPABASE_BUCKET_NAME || 'incidentes'

  const fechaActual = new Date().toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short'
  })

  const categorias = [
    'General',
    'Baño',
    'Electricidad',
    'Infraestructura',
    'Seguridad',
    'Tecnología',
    'Otro'
  ]

  const zonasUniversidad = [
    'Parqueaderos',
    'Bloque 1',
    'Bloque 2',
    'Bloque 3',
    'Bloque 4',
    'Bloque 5',
    'Bloque 6',
    'Bloque 7',
    'Biblioteca',
    'Baños',
    'Cafetería',
    'Otro'
  ]

  const estadosAtencion = [
    'Reportado',
    'En proceso',
    'Resuelto'
  ]

  const isAdmin = rolUsuario === 'admin'

  const crearNotificacion = async ({
    titulo,
    mensaje,
    tipo,
    incidenteId = '',
    incidenteTitulo = '',
    destinatarioId = '',
    destinatarioEmail = '',
    destinatarioRol = ''
  }) => {
    await addDoc(collection(db, 'notificaciones'), {
      titulo,
      mensaje,
      tipo,
      incidenteId,
      incidenteTitulo,
      destinatarioId,
      destinatarioEmail,
      destinatarioRol,
      leido: false,
      fecha: serverTimestamp()
    })
  }

  const esNotificacionVisible = (notificacion) => {
    const currentUser = auth.currentUser

    if (!currentUser) return false

    if (notificacion.destinatarioId === currentUser.uid) return true

    if (isAdmin && notificacion.destinatarioRol === 'admin') return true

    return false
  }

  const formatearFechaNotificacion = (fecha) => {
    if (fecha?.seconds) {
      return new Date(fecha.seconds * 1000).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    }

    return 'Ahora'
  }

  const marcarNotificacionLeida = async (idNotificacion) => {
    try {
      await updateDoc(doc(db, 'notificaciones', idNotificacion), {
        leido: true,
        fechaLectura: serverTimestamp()
      })
    } catch (readError) {
      console.error('Error marcando notificación como leída:', readError)
    }
  }

  const marcarTodasLeidas = async () => {
    try {
      const batch = writeBatch(db)

      notificacionesVisibles
        .filter((notificacion) => !notificacion.leido)
        .forEach((notificacion) => {
          batch.update(doc(db, 'notificaciones', notificacion.id), {
            leido: true,
            fechaLectura: serverTimestamp()
          })
        })

      await batch.commit()
    } catch (readError) {
      console.error('Error marcando todas las notificaciones:', readError)
    }
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setLoadingRol(true)

        if (!currentUser) {
          setRolUsuario('usuario')
          return
        }

        const uidActual = currentUser.uid
        const correoActual = String(currentUser.email || '').trim().toLowerCase()

        let rolEncontrado = 'usuario'

        const userDocRef = doc(db, 'usuarios', uidActual)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const data = userDoc.data()
          rolEncontrado = String(data.rol || 'usuario').trim().toLowerCase()
        } else {
          const uidQuery = query(
            collection(db, 'usuarios'),
            where('uid', '==', uidActual)
          )

          const uidSnapshot = await getDocs(uidQuery)

          if (!uidSnapshot.empty) {
            const data = uidSnapshot.docs[0].data()
            rolEncontrado = String(data.rol || 'usuario').trim().toLowerCase()
          } else {
            const correoQuery = query(
              collection(db, 'usuarios'),
              where('correo', '==', correoActual)
            )

            const correoSnapshot = await getDocs(correoQuery)

            if (!correoSnapshot.empty) {
              const data = correoSnapshot.docs[0].data()
              rolEncontrado = String(data.rol || 'usuario').trim().toLowerCase()
            } else {
              const todosUsuariosSnapshot = await getDocs(collection(db, 'usuarios'))

              todosUsuariosSnapshot.forEach((documento) => {
                const data = documento.data()
                const correoDocumento = String(data.correo || '').trim().toLowerCase()
                const uidDocumento = String(data.uid || '').trim()

                if (
                  correoDocumento === correoActual ||
                  uidDocumento === uidActual ||
                  documento.id === uidActual
                ) {
                  rolEncontrado = String(data.rol || 'usuario').trim().toLowerCase()
                }
              })
            }
          }
        }

        if (rolEncontrado === 'admin') {
          setRolUsuario('admin')
        } else {
          setRolUsuario('usuario')
        }
      } catch (rolError) {
        console.error('Error cargando rol:', rolError)
        setRolUsuario('usuario')
      } finally {
        setLoadingRol(false)
      }
    })

    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    if (!loadingRol && isAdmin && activeTab === 'reportar') {
      setActiveTab('admin')
    }
  }, [loadingRol, isAdmin, activeTab])

  useEffect(() => {
    const incidentsQuery = query(
      collection(db, 'incidentes'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      incidentsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }))

        setIncidentes(data)
      },
      (snapshotError) => {
        console.error('Error cargando incidentes:', snapshotError)
      }
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const notificationsQuery = query(
      collection(db, 'notificaciones'),
      orderBy('fecha', 'desc')
    )

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }))

        setNotificaciones(data)
      },
      (notificationError) => {
        console.error('Error cargando notificaciones:', notificationError)
      }
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!isAdmin || incidentes.length === 0) return

    const revisarIncidentesSinResolver = async () => {
      const limiteHoras = 24
      const ahora = Date.now()

      const incidentesPendientes = incidentes.filter((item) => {
        const estado = getEstado(item)

        if (estado === 'Resuelto') return false

        const fechaBase = item.fechaActualizacionEstado?.seconds
          ? item.fechaActualizacionEstado.seconds * 1000
          : item.createdAt?.seconds
            ? item.createdAt.seconds * 1000
            : item.fechaCreacion?.seconds
              ? item.fechaCreacion.seconds * 1000
              : null

        if (!fechaBase) return false

        const horasSinResolver = (ahora - fechaBase) / (1000 * 60 * 60)
        return horasSinResolver >= limiteHoras
      })

      for (const item of incidentesPendientes) {
        try {
          const notificacionId = `pendiente-${item.id}`
          const notificacionRef = doc(db, 'notificaciones', notificacionId)
          const notificacionExistente = await getDoc(notificacionRef)

          if (!notificacionExistente.exists()) {
            await setDoc(notificacionRef, {
              titulo: 'Incidente sin resolver',
              mensaje: `El incidente "${getTitulo(item)}" lleva más de 24 horas sin avanzar al estado "Resuelto".`,
              tipo: 'incidente_pendiente',
              incidenteId: item.id,
              incidenteTitulo: getTitulo(item),
              destinatarioRol: 'admin',
              destinatarioId: '',
              destinatarioEmail: '',
              leido: false,
              fecha: serverTimestamp()
            })
          }
        } catch (pendingError) {
          console.error('Error creando alerta de incidente pendiente:', pendingError)
        }
      }
    }

    revisarIncidentesSinResolver()
  }, [isAdmin, incidentes])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }

    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
        cameraStreamRef.current = null
      }
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value
    }))
  }

  const handleImageChange = (event) => {
    const selectedFile = event.target.files?.[0] || null
    setImageFile(selectedFile)
    setCameraError('')
  }

  const abrirCamaraReal = async () => {
    setError('')
    setCameraError('')

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no permite acceder directamente a la cámara.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      })

      cameraStreamRef.current = stream
      setShowCamera(true)

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch (cameraAccessError) {
      console.error('Error abriendo cámara:', cameraAccessError)

      setCameraError(
        'No se pudo abrir la cámara. Revisa los permisos del navegador o usa la opción de seleccionar imagen.'
      )
    }
  }

  const cerrarCamara = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }

    setShowCamera(false)
  }

  const tomarFoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      setCameraError('No se pudo capturar la imagen.')
      return
    }

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('No se pudo generar la fotografía.')
          return
        }

        const fileName = `foto-incidente-${Date.now()}.jpg`

        const file = new File([blob], fileName, {
          type: 'image/jpeg'
        })

        setImageFile(file)
        setCameraError('')
        cerrarCamara()
      },
      'image/jpeg',
      0.92
    )
  }

  const obtenerUbicacionGPS = () => {
    setError('')

    if (!navigator.geolocation) {
      setError('Tu navegador no permite usar geolocalización.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        const userPosition = {
          lat,
          lng
        }

        setCurrentPosition(userPosition)
        setSelectedPosition(userPosition)

        setForm((current) => ({
          ...current,
          latitud: lat,
          longitud: lng,
          ubicacion: `GPS - Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
        }))
      },
      () => {
        setError('No se pudo obtener la ubicación GPS. Puedes escribirla manualmente.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const abrirMapaConUbicacion = () => {
    setError('')
    setShowMap(true)

    if (form.latitud && form.longitud) {
      const savedPosition = {
        lat: Number(form.latitud),
        lng: Number(form.longitud)
      }

      setCurrentPosition(savedPosition)
      setSelectedPosition(savedPosition)
      return
    }

    if (!navigator.geolocation) {
      setError('Tu navegador no permite usar geolocalización. Puedes seleccionar el punto manualmente en el mapa.')
      return
    }

    setMapLoading(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        const userPosition = {
          lat,
          lng
        }

        setCurrentPosition(userPosition)
        setSelectedPosition(userPosition)

        setForm((current) => ({
          ...current,
          latitud: lat,
          longitud: lng,
          ubicacion: `GPS - Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
        }))

        setMapLoading(false)
      },
      () => {
        setMapLoading(false)
        setError('No se pudo obtener tu ubicación actual. Puedes seleccionar el punto manualmente en el mapa.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const guardarUbicacionMapa = () => {
    const positionToSave = selectedPosition || currentPosition

    if (!positionToSave) {
      setError('Selecciona un punto en el mapa o permite usar tu ubicación actual.')
      return
    }

    setForm((current) => ({
      ...current,
      latitud: positionToSave.lat,
      longitud: positionToSave.lng,
      ubicacion: `Mapa - Lat: ${positionToSave.lat.toFixed(6)}, Lng: ${positionToSave.lng.toFixed(6)}`
    }))

    setShowMap(false)
    setError('')
  }

  const uploadImage = async (currentUser) => {
    if (!imageFile) {
      throw new Error('La imagen del incidente es obligatoria.')
    }

    const cleanName = imageFile.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9.-]/g, '')

    const filePath = `${currentUser.uid}/${Date.now()}-${cleanName}`

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: imageFile.type
      })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw new Error('Debes iniciar sesión para reportar un incidente.')
      }

      if (!form.titulo.trim()) {
        throw new Error('Debes escribir el título del incidente.')
      }

      if (!form.descripcion.trim()) {
        throw new Error('Debes escribir la descripción detallada del incidente.')
      }

      if (!form.zonaUniversidad) {
        throw new Error('Debes seleccionar la zona de la universidad.')
      }

      if (form.zonaUniversidad === 'Otro' && !form.zonaOtro.trim()) {
        throw new Error('Debes escribir cuál es la otra zona de la universidad.')
      }

      if (!form.ubicacion.trim()) {
        throw new Error('Debes escribir una ubicación o seleccionarla desde el mapa/GPS.')
      }

      if (!imageFile) {
        throw new Error('La fotografía del incidente es obligatoria.')
      }

      const imageUrl = await uploadImage(currentUser)

      const incidenteRef = await addDoc(collection(db, 'incidentes'), {
        titulo: form.titulo,
        descripcion: form.descripcion,
        title: form.titulo,
        description: form.descripcion,
        ubicacion: form.ubicacion,
        ubicacionTexto: form.ubicacion,
        zonaUniversidad: form.zonaUniversidad === 'Otro' ? form.zonaOtro.trim() : form.zonaUniversidad,
        zonaUniversidadSeleccionada: form.zonaUniversidad,
        zonaOtro: form.zonaOtro.trim(),
        categoria: form.categoria,
        tipo: form.categoria,
        latitud: form.latitud,
        longitud: form.longitud,
        estado: 'Reportado',
        estadoAtencion: 'Reportado',
        grupoId: '',
        agrupado: false,
        fechaHoraTexto: fechaActual,
        imageUrl: imageUrl,
        imagenURL: imageUrl,
        fotoUrl: imageUrl,
        usuarioId: currentUser.uid,
        createdBy: currentUser.uid,
        correoUsuario: currentUser.email || '',
        createdByEmail: currentUser.email || '',
        fechaCreacion: serverTimestamp(),
        createdAt: serverTimestamp(),
        fechaActualizacionEstado: serverTimestamp()
      })

      await crearNotificacion({
        titulo: 'Nuevo incidente reportado',
        mensaje: `Se registró un nuevo incidente: ${form.titulo}.`,
        tipo: 'nuevo_incidente',
        incidenteId: incidenteRef.id,
        incidenteTitulo: form.titulo,
        destinatarioRol: 'admin'
      })

      setForm(initialForm)
      setImageFile(null)
      setSelectedPosition(null)
      setCurrentPosition(null)
      setSuccess('Incidente guardado correctamente.')
      setActiveTab('incidentes')
    } catch (saveError) {
      console.error(saveError)
      setError(saveError.message || 'No fue posible guardar el incidente.')
    } finally {
      setSaving(false)
    }
  }

  const getImage = (item) => {
    return item.imageUrl || item.imagenURL || item.fotoUrl || ''
  }

  const getEstado = (item) => {
    return item.estadoAtencion || item.estado || 'Reportado'
  }

  const getTitulo = (item) => {
    return item.titulo || item.title || 'Sin título'
  }

  const getDescripcion = (item) => {
    return item.descripcion || item.description || 'Sin descripción registrada.'
  }

  const getUbicacion = (item) => {
    return item.ubicacion || item.ubicacionTexto || 'Sin ubicación'
  }

  const getZonaUniversidad = (item) => {
    return item.zonaUniversidad || 'No registrada'
  }

  const getCategoria = (item) => {
    return item.categoria || item.tipo || 'General'
  }

  const getUsuario = (item) => {
    return item.createdByEmail || item.correoUsuario || item.userEmail || 'No registrado'
  }

  const getFechaDate = (item) => {
    if (item.createdAt?.seconds) {
      return new Date(item.createdAt.seconds * 1000)
    }

    if (item.fechaCreacion?.seconds) {
      return new Date(item.fechaCreacion.seconds * 1000)
    }

    return null
  }

  const getFecha = (item) => {
    if (item.fechaHoraTexto) return item.fechaHoraTexto

    if (item.createdAt?.seconds) {
      return new Date(item.createdAt.seconds * 1000).toLocaleString('es-CO', {
        dateStyle: 'long',
        timeStyle: 'short'
      })
    }

    if (item.fechaCreacion?.seconds) {
      return new Date(item.fechaCreacion.seconds * 1000).toLocaleString('es-CO', {
        dateStyle: 'long',
        timeStyle: 'short'
      })
    }

    return 'Fecha no registrada'
  }

  const getFechaActualizacionEstado = (item) => {
    if (item.fechaActualizacionEstado?.seconds) {
      return new Date(item.fechaActualizacionEstado.seconds * 1000).toLocaleString('es-CO', {
        dateStyle: 'long',
        timeStyle: 'short'
      })
    }

    return 'Sin actualización registrada'
  }

  const getEstadoIcono = (estado) => {
    if (estado === 'Resuelto') return '🟢'
    if (estado === 'En proceso') return '🔵'
    return '🟡'
  }

  const getEstadoClass = (estado) => {
    return estado.toLowerCase().replaceAll(' ', '-')
  }

  const filtrarPorPeriodo = (item) => {
    if (periodoEstadistica === 'Todos') return true

    const fecha = getFechaDate(item)

    if (!fecha) return false

    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

    const inicioSemana = new Date(hoy)
    inicioSemana.setDate(hoy.getDate() - 7)

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

    if (periodoEstadistica === 'Hoy') {
      return fecha >= inicioHoy
    }

    if (periodoEstadistica === 'Últimos 7 días') {
      return fecha >= inicioSemana
    }

    if (periodoEstadistica === 'Este mes') {
      return fecha >= inicioMes
    }

    return true
  }

  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter((item) => {
      const texto = `
        ${getTitulo(item)}
        ${getDescripcion(item)}
        ${getZonaUniversidad(item)}
        ${getUbicacion(item)}
        ${getEstado(item)}
        ${item.grupoId || ''}
      `.toLowerCase()

      const coincideTexto = texto.includes(search.toLowerCase())
      const coincideEstado = filterEstado === 'Todos' || getEstado(item) === filterEstado
      const coincideCategoria =
        filterCategoria === 'Todas' ||
        item.categoria === filterCategoria ||
        item.tipo === filterCategoria

      return coincideTexto && coincideEstado && coincideCategoria
    })
  }, [incidentes, search, filterEstado, filterCategoria])

  const incidentesPorPeriodo = incidentes.filter(filtrarPorPeriodo)

  const totalIncidentes = incidentesPorPeriodo.length
  const totalReportados = incidentesPorPeriodo.filter((item) => getEstado(item) === 'Reportado').length
  const totalProceso = incidentesPorPeriodo.filter((item) => getEstado(item) === 'En proceso').length
  const totalResueltos = incidentesPorPeriodo.filter((item) => getEstado(item) === 'Resuelto').length

  const conteoCategorias = categorias.map((categoria) => ({
    categoria,
    total: incidentesPorPeriodo.filter((item) => item.categoria === categoria || item.tipo === categoria).length
  }))

  const maxCategoria = Math.max(...conteoCategorias.map((item) => item.total), 1)

  const datosEstados = [
    {
      label: 'Reportado',
      valor: totalReportados,
      color: '#f59e0b',
      descripcion: 'Pendientes de revisión'
    },
    {
      label: 'En proceso',
      valor: totalProceso,
      color: '#2563eb',
      descripcion: 'Actualmente en atención'
    },
    {
      label: 'Resuelto',
      valor: totalResueltos,
      color: '#16a34a',
      descripcion: 'Solucionados o finalizados'
    }
  ]

  const fondoGraficaEstados = (() => {
    if (!totalIncidentes) {
      return 'conic-gradient(#e5e7eb 0 100%)'
    }

    let acumulado = 0

    const segmentos = datosEstados
      .filter((item) => item.valor > 0)
      .map((item) => {
        const inicio = acumulado
        acumulado += (item.valor / totalIncidentes) * 100
        return `${item.color} ${inicio}% ${acumulado}%`
      })

    return `conic-gradient(${segmentos.join(', ')})`
  })()

  const notificacionesVisibles = useMemo(() => {
    return notificaciones.filter((notificacion) => esNotificacionVisible(notificacion))
  }, [notificaciones, isAdmin])

  const notificacionesSinLeer = notificacionesVisibles.filter(
    (notificacion) => !notificacion.leido
  ).length

  const gruposIncidentes = useMemo(() => {
    const grupos = {}

    incidentes.forEach((item) => {
      if (item.grupoId) {
        if (!grupos[item.grupoId]) {
          grupos[item.grupoId] = []
        }

        grupos[item.grupoId].push(item)
      }
    })

    return Object.entries(grupos).map(([grupoId, items]) => ({
      grupoId,
      items,
      estado: getEstado(items[0]),
      total: items.length
    }))
  }, [incidentes])

  const imprimirEstadisticas = () => {
    window.print()
  }

  const actualizarEstadoAtencion = async (incidente, nuevoEstado) => {
    if (!isAdmin) {
      setError('Solo el administrador puede cambiar el estado de atención.')
      return
    }

    setError('')
    setSuccess('')
    setUpdatingEstadoId(incidente.id)

    try {
      const currentUser = auth.currentUser
      const batch = writeBatch(db)
      let incidentesNotificar = [incidente]

      if (incidente.grupoId) {
        const grupoQuery = query(
          collection(db, 'incidentes'),
          where('grupoId', '==', incidente.grupoId)
        )

        const grupoSnapshot = await getDocs(grupoQuery)

        incidentesNotificar = []

        grupoSnapshot.forEach((documento) => {
          incidentesNotificar.push({
            id: documento.id,
            ...documento.data()
          })

          batch.update(documento.ref, {
            estado: nuevoEstado,
            estadoAtencion: nuevoEstado,
            fechaActualizacionEstado: serverTimestamp(),
            estadoActualizadoPor: currentUser?.email || 'Administrador'
          })
        })

        await batch.commit()
        setSuccess(`Estado actualizado a "${nuevoEstado}" para todos los incidentes del grupo.`)
      } else {
        await updateDoc(doc(db, 'incidentes', incidente.id), {
          estado: nuevoEstado,
          estadoAtencion: nuevoEstado,
          fechaActualizacionEstado: serverTimestamp(),
          estadoActualizadoPor: currentUser?.email || 'Administrador'
        })

        setSuccess(`Estado actualizado a "${nuevoEstado}".`)
      }

      const usuariosNotificados = new Set()

      for (const item of incidentesNotificar) {
        const destinatarioId = item.usuarioId || item.createdBy || ''

        if (!destinatarioId || usuariosNotificados.has(`${destinatarioId}-${item.id}`)) continue

        usuariosNotificados.add(`${destinatarioId}-${item.id}`)

        await crearNotificacion({
          titulo: 'Estado actualizado',
          mensaje: `Tu incidente "${getTitulo(item)}" cambió al estado "${nuevoEstado}".`,
          tipo: 'cambio_estado',
          incidenteId: item.id,
          incidenteTitulo: getTitulo(item),
          destinatarioId,
          destinatarioEmail: getUsuario(item)
        })
      }

      if (detalleIncidente?.id === incidente.id) {
        setDetalleIncidente((current) => ({
          ...current,
          estado: nuevoEstado,
          estadoAtencion: nuevoEstado
        }))
      }
    } catch (updateError) {
      console.error(updateError)
      setError('No fue posible actualizar el estado de atención.')
    } finally {
      setUpdatingEstadoId('')
    }
  }

  const toggleSeleccionAgrupar = (idIncidente) => {
    setSelectedIncidentesGrupo((current) => {
      if (current.includes(idIncidente)) {
        return current.filter((id) => id !== idIncidente)
      }

      return [...current, idIncidente]
    })
  }

  const agruparIncidentes = async () => {
    if (!isAdmin) {
      setError('Solo el administrador puede agrupar incidentes.')
      return
    }

    if (selectedIncidentesGrupo.length < 2) {
      setError('Selecciona dos o más incidentes para agrupar.')
      return
    }

    setError('')
    setSuccess('')
    setAgrupando(true)

    try {
      const incidentesSeleccionados = incidentes.filter((item) =>
        selectedIncidentesGrupo.includes(item.id)
      )

      const grupoExistente = incidentesSeleccionados.find((item) => item.grupoId)?.grupoId
      const nuevoGrupoId = grupoExistente || `grupo-${Date.now()}`
      const estadoBase = getEstado(incidentesSeleccionados[0])

      const batch = writeBatch(db)

      incidentesSeleccionados.forEach((item) => {
        const ref = doc(db, 'incidentes', item.id)

        batch.update(ref, {
          grupoId: nuevoGrupoId,
          agrupado: true,
          estado: estadoBase,
          estadoAtencion: estadoBase,
          fechaAgrupacion: serverTimestamp(),
          fechaActualizacionEstado: serverTimestamp()
        })
      })

      await batch.commit()

      setSelectedIncidentesGrupo([])
      setSuccess(`Incidentes agrupados correctamente en el grupo ${nuevoGrupoId}.`)
      setActiveTab('grupos')
    } catch (groupError) {
      console.error(groupError)
      setError('No fue posible agrupar los incidentes seleccionados.')
    } finally {
      setAgrupando(false)
    }
  }

  const HojasCayendo = () => {
    const hojas = ['🌸', '🍂', '🦜', '🍃', '🌿', '🏵️', '🍃', '🍂','🌸', '🍂', '🦜', '🍃', '🌿', '🏵️', '🍃', '🍂']

    return (
      <div className='falling-leaves' aria-hidden='true'>
        {hojas.map((hoja, index) => (
          <span key={`${hoja}-${index}`}>{hoja}</span>
        ))}
      </div>
    )
  }

  return (
    <main className='dashboard-page'>
      <div className='dashboard-bg-leaves'>
        <HojasCayendo />
      </div>

      <section className='dashboard-hero hero-card-style'>
        <div>
          <p className='dashboard-kicker'>
            {loadingRol
              ? 'Sesión iniciada · Cargando rol...'
              : isAdmin
                ? 'Sesión iniciada · Administrador'
                : 'Sesión iniciada · Usuario'}
          </p>

          <nav className='dashboard-tabs tabs-inside-hero'>
            {!isAdmin && (
              <>
                <button
                  type='button'
                  className={activeTab === 'reportar' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('reportar')}
                >
                  Formulario incidente
                </button>

                <button
                  type='button'
                  className={activeTab === 'estadisticas' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('estadisticas')}
                >
                  Estadísticas
                </button>

                <button
                  type='button'
                  className={activeTab === 'incidentes' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('incidentes')}
                >
                  Incidentes registrados
                </button>

                <button
                  type='button'
                  className={activeTab === 'notificaciones' ? 'tab active notification-tab' : 'tab notification-tab'}
                  onClick={() => setActiveTab('notificaciones')}
                >
                  🔔 Notificaciones
                  {notificacionesSinLeer > 0 && (
                    <span className='notification-counter'>{notificacionesSinLeer}</span>
                  )}
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button
                  type='button'
                  className={activeTab === 'admin' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('admin')}
                >
                  Panel administrador
                </button>

                <button
                  type='button'
                  className={activeTab === 'grupos' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('grupos')}
                >
                  Incidentes agrupados
                </button>

                <button
                  type='button'
                  className={activeTab === 'estadisticas' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('estadisticas')}
                >
                  Estadísticas y reportes
                </button>

                <button
                  type='button'
                  className={activeTab === 'notificaciones' ? 'tab active notification-tab' : 'tab notification-tab'}
                  onClick={() => setActiveTab('notificaciones')}
                >
                  🔔 Notificaciones
                  {notificacionesSinLeer > 0 && (
                    <span className='notification-counter'>{notificacionesSinLeer}</span>
                  )}
                </button>
              </>
            )}
          </nav>

          {activeTab === 'reportar' && !isAdmin && (
            <>
              <h1>Formulario de reporte de incidentes</h1>
              <p className='dashboard-description'>
                Registra un nuevo incidente diligenciando el formulario, adjuntando una fotografía
                obligatoria y seleccionando la ubicación correspondiente.
              </p>
            </>
          )}

          {activeTab === 'estadisticas' && (
            <>
              <h1>Estadísticas de incidentes</h1>
              <p className='dashboard-description'>
                Consulta el resumen general de incidentes registrados, clasificados por estado,
                tipo y periodo. También puedes enviar el reporte a impresión.
              </p>
            </>
          )}

          {activeTab === 'incidentes' && !isAdmin && (
            <>
              <h1>Incidentes registrados</h1>
              <p className='dashboard-description'>
                Revisa los reportes guardados, filtra por estado o categoría y abre el detalle
                de cada incidente.
              </p>
            </>
          )}

          {activeTab === 'admin' && isAdmin && (
            <>
              <h1>Gestión de estados</h1>
              <p className='dashboard-description'>
                Cambia el estado de atención de los incidentes y agrupa reportes repetidos.
              </p>
            </>
          )}

          {activeTab === 'grupos' && isAdmin && (
            <>
              <h1>Incidentes agrupados</h1>
              <p className='dashboard-description'>
                Consulta los grupos de incidentes repetidos creados por el administrador.
                El estado aplicado a un incidente agrupado se refleja en todos los incidentes del grupo.
              </p>
            </>
          )}

          {activeTab === 'notificaciones' && (
            <>
              <h1>Centro de notificaciones</h1>
              <p className='dashboard-description'>
                Revisa las alertas del sistema sobre nuevos incidentes, cambios de estado
                e incidentes que llevan tiempo sin avanzar al estado Resuelto.
              </p>
            </>
          )}
        </div>
      </section>

      {error && activeTab !== 'reportar' && (
        <p className='form-message error global-message'>{error}</p>
      )}

      {success && activeTab !== 'reportar' && (
        <p className='form-message success global-message'>{success}</p>
      )}

      {activeTab === 'reportar' && !isAdmin && (
        <section className='panel panel-form single-panel reportar-page-animated'>
          <HojasCayendo />

          <h2>Reportar incidente</h2>
          <p className='panel-description'>
            Diligencia la información del incidente y adjunta una fotografía obligatoria.
          </p>

          <form className='incident-form' onSubmit={handleSubmit}>
            <div className='incident-form-row'>
              <label>
                Tipo de incidente
                <select
                  name='categoria'
                  value={form.categoria}
                  onChange={handleChange}
                >
                  {categorias.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Estado inicial
                <div className='estado-inicial'>
                  <span className='status-badge reportado'>🟡 Reportado</span>
                  <small>Este estado se asigna cuando el incidente queda registrado.</small>
                </div>
              </label>
            </div>

            <label>
              Título
              <input
                name='titulo'
                value={form.titulo}
                onChange={handleChange}
                placeholder='Ej. Fuga de agua'
                required
              />
            </label>

            <label>
              Descripción detallada
              <textarea
                name='descripcion'
                value={form.descripcion}
                onChange={handleChange}
                placeholder='Describe qué ocurrió, cuándo ocurrió y cómo afecta'
                rows='4'
                required
              />
            </label>

            <div className='incident-form-row'>
              <label>
                Zona de la universidad
                <select
                  name='zonaUniversidad'
                  value={form.zonaUniversidad}
                  onChange={handleChange}
                  required
                >
                  <option value=''>Selecciona una zona</option>

                  {zonasUniversidad.map((zona) => (
                    <option key={zona} value={zona}>
                      {zona}
                    </option>
                  ))}
                </select>
              </label>

              {form.zonaUniversidad === 'Otro' && (
                <label>
                  Especificar otra zona
                  <input
                    name='zonaOtro'
                    value={form.zonaOtro}
                    onChange={handleChange}
                    placeholder='Escribe la zona de la universidad'
                    required
                  />
                </label>
              )}
            </div>

            <label>
              Ubicación
              <div className='location-row'>
                <input
                  name='ubicacion'
                  value={form.ubicacion}
                  onChange={handleChange}
                  placeholder='Usa GPS o selecciona el punto en el mapa'
                  required
                />

                <button
                  type='button'
                  className='map-btn'
                  onClick={abrirMapaConUbicacion}
                >
                  📌 Mapa
                </button>

                <button
                  type='button'
                  className='gps-btn'
                  onClick={obtenerUbicacionGPS}
                >
                  🛰️ GPS
                </button>
              </div>
            </label>

            <div className='auto-info-grid'>
              <div className='auto-info-card'>
                <strong>Fecha y hora automática</strong>
                <span>{fechaActual}</span>
              </div>
            </div>

            <div className='image-upload-section'>
              <div className='image-upload-header'>
                <div>
                  <span className='image-upload-title'>Fotografía obligatoria</span>
                  <p className='image-upload-text'>
                    Puedes seleccionar una imagen desde tu dispositivo o tomar una foto directamente con la cámara.
                  </p>
                </div>

                {imageFile && (
                  <span className='image-ready-badge'>
                    Imagen lista
                  </span>
                )}
              </div>

              <div className='image-upload-options'>
                <label className='image-upload-btn gallery-btn'>
                  <span className='upload-icon'>🖼️</span>
                  <span>Seleccionar imagen</span>

                  <input
                    type='file'
                    accept='image/*'
                    onChange={handleImageChange}
                  />
                </label>

                <button
                  type='button'
                  className='image-upload-btn camera-btn'
                  onClick={abrirCamaraReal}
                >
                  <span className='upload-icon'>📷</span>
                  <span>Tomar foto</span>
                </button>
              </div>

              {cameraError && (
                <small className='camera-error-message'>
                  {cameraError}
                </small>
              )}

              {imageFile && (
                <small className='image-file-name'>
                  Archivo seleccionado: {imageFile.name}
                </small>
              )}
            </div>

            {imagePreview && (
              <div className='preview-box'>
                <p>Vista previa de la imagen</p>
                <img
                  className='incident-preview'
                  src={imagePreview}
                  alt='Vista previa del incidente'
                />
              </div>
            )}

            {error && <p className='form-message error'>{error}</p>}
            {success && <p className='form-message success'>{success}</p>}

            <button
              className='btn btn-primary submit-btn'
              type='submit'
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar incidente'}
            </button>
          </form>
        </section>
      )}

      {activeTab === 'estadisticas' && (
        <section className='dashboard-page-section page-with-leaves report-print-area'>
          <HojasCayendo />

          <div className='report-filter-panel'>
            <div>
              <h3>Visualizaciones y reportes</h3>
              <p>
                Filtra las estadísticas por periodo y envía el reporte completo a impresión.
              </p>
            </div>

            <div className='report-filter-actions'>
              <select
                value={periodoEstadistica}
                onChange={(event) => setPeriodoEstadistica(event.target.value)}
              >
                <option value='Todos'>Todos los periodos</option>
                <option value='Hoy'>Hoy</option>
                <option value='Últimos 7 días'>Últimos 7 días</option>
                <option value='Este mes'>Este mes</option>
              </select>

              <button
                className='btn btn-secondary print-btn'
                type='button'
                onClick={imprimirEstadisticas}
              >
                Imprimir reporte
              </button>
            </div>
          </div>

          <div className='stats-grid improved-stats'>
            <article className='stat-card total'>
              <span>Total de incidentes</span>
              <strong>{totalIncidentes}</strong>
              <p>Reportes registrados en el periodo seleccionado.</p>
            </article>

            <article className='stat-card reportado'>
              <span>Reportados</span>
              <strong>{totalReportados}</strong>
              <p>Incidentes pendientes de revisión.</p>
            </article>

            <article className='stat-card proceso'>
              <span>En proceso</span>
              <strong>{totalProceso}</strong>
              <p>Incidentes que actualmente están siendo atendidos.</p>
            </article>

            <article className='stat-card resuelto'>
              <span>Resueltos</span>
              <strong>{totalResueltos}</strong>
              <p>Incidentes solucionados o finalizados.</p>
            </article>
          </div>

          <div className='stats-content-grid'>
            <section className='chart-box improved-chart'>
              <div className='chart-header'>
                <div>
                  <h3>Incidentes por tipo</h3>
                  <p>
                    Distribución de reportes según la categoría y periodo seleccionado.
                  </p>
                </div>
              </div>

              <div className='bar-list'>
                {conteoCategorias.map((item) => (
                  <div className='bar-row' key={item.categoria}>
                    <span>{item.categoria}</span>

                    <div className='bar-track'>
                      <div
                        className='bar-fill'
                        style={{ width: `${(item.total / maxCategoria) * 100}%` }}
                      />
                    </div>

                    <strong>{item.total}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className='chart-box improved-chart chart-secondary'>
              <div className='chart-header'>
                <div>
                  <h3>Incidentes por estado</h3>
                  <p>
                    Distribución general de incidentes según su estado de atención.
                  </p>
                </div>
              </div>

              <div className='status-chart-content'>
                <div
                  className='donut-chart-visual'
                  style={{ background: fondoGraficaEstados }}
                >
                  <div className='donut-hole'>
                    <strong>{totalIncidentes}</strong>
                    <span>Total</span>
                  </div>
                </div>

                <div className='status-legend'>
                  {datosEstados.map((item) => {
                    const porcentaje = totalIncidentes
                      ? ((item.valor / totalIncidentes) * 100).toFixed(0)
                      : 0

                    return (
                      <div className='status-legend-item' key={item.label}>
                        <div className='legend-main'>
                          <span
                            className='legend-dot'
                            style={{ backgroundColor: item.color }}
                          />

                          <div className='legend-text'>
                            <strong>{item.label}</strong>
                            <small>{item.descripcion}</small>
                          </div>
                        </div>

                        <div className='legend-meta'>
                          <strong>{item.valor}</strong>
                          <span>{porcentaje}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>
        </section>
      )}

      {activeTab === 'incidentes' && !isAdmin && (
        <section className='dashboard-page-section page-with-leaves'>
          <HojasCayendo />

          <div className='consult-panel'>
            <div className='consult-panel-header'>
              <div>
                <h3>Filtros de consulta</h3>
                <p>Utiliza los filtros para encontrar rápidamente un incidente registrado.</p>
              </div>

              <span className='results-pill'>
                {incidentesFiltrados.length} de {incidentes.length} incidentes
              </span>
            </div>

            <div className='quick-filter-row'>
              {['Todos', 'Reportado', 'En proceso', 'Resuelto'].map((estado) => (
                <button
                  type='button'
                  key={estado}
                  className={filterEstado === estado ? 'quick-filter active' : 'quick-filter'}
                  onClick={() => setFilterEstado(estado)}
                >
                  {estado === 'Todos' ? '📋 Todos' : `${getEstadoIcono(estado)} ${estado}`}
                </button>
              ))}
            </div>

            <div className='filters-box improved-filters'>
              <input
                type='text'
                placeholder='Buscar por título, descripción, zona o ubicación'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <select
                value={filterEstado}
                onChange={(event) => setFilterEstado(event.target.value)}
              >
                <option value='Todos'>Todos los estados</option>
                <option value='Reportado'>Reportado</option>
                <option value='En proceso'>En proceso</option>
                <option value='Resuelto'>Resuelto</option>
              </select>

              <select
                value={filterCategoria}
                onChange={(event) => setFilterCategoria(event.target.value)}
              >
                <option value='Todas'>Todas las categorías</option>
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='incident-cards improved-incident-list'>
            {incidentesFiltrados.length === 0 ? (
              <div className='empty-state improved-empty'>
                <strong>No se encontraron incidentes.</strong>
                <span>Prueba cambiar el estado, la categoría o el texto de búsqueda.</span>
              </div>
            ) : (
              incidentesFiltrados.map((item) => {
                const image = getImage(item)
                const estado = getEstado(item)

                return (
                  <article key={item.id} className='incident-card improved-card'>
                    {image ? (
                      <img
                        className='incident-card-image'
                        src={image}
                        alt={getTitulo(item)}
                      />
                    ) : (
                      <div className='incident-card-image no-image'>
                        Sin imagen
                      </div>
                    )}

                    <div className='incident-card-content'>
                      <div className='incident-card-top'>
                        <h3>{getTitulo(item)}</h3>

                        <span className={`status-badge ${getEstadoClass(estado)}`}>
                          {getEstadoIcono(estado)} {estado}
                        </span>
                      </div>

                      <p>
                        {getDescripcion(item).length > 120
                          ? `${getDescripcion(item).slice(0, 120)}...`
                          : getDescripcion(item)}
                      </p>

                      <div className='incident-meta'>
                        <span><strong>Tipo:</strong> {getCategoria(item)}</span>
                        <span><strong>Zona:</strong> {getZonaUniversidad(item)}</span>
                        <span><strong>Ubicación:</strong> {getUbicacion(item)}</span>
                        <span><strong>Fecha:</strong> {getFecha(item)}</span>
                        <span><strong>Última actualización:</strong> {getFechaActualizacionEstado(item)}</span>

                        {item.grupoId && (
                          <span><strong>Grupo:</strong> {item.grupoId}</span>
                        )}

                        {item.latitud && item.longitud && (
                          <span>
                            <strong>Coordenadas:</strong> {Number(item.latitud).toFixed(6)}, {Number(item.longitud).toFixed(6)}
                          </span>
                        )}
                      </div>

                      <button
                        type='button'
                        className='btn btn-secondary detail-btn'
                        onClick={() => setDetalleIncidente(item)}
                      >
                        Ver detalle del incidente
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>
      )}

      {activeTab === 'notificaciones' && (
        <section className='dashboard-page-section page-with-leaves'>
          <HojasCayendo />

          <div className='notifications-panel-box'>
            <div className='consult-panel-header'>
              <div>
                <h3>Notificaciones del sistema</h3>
                <p>
                  {isAdmin
                    ? 'Aquí recibes avisos de nuevos incidentes y alertas de reportes sin resolver.'
                    : 'Aquí recibes avisos cuando cambia el estado de los incidentes que reportaste.'}
                </p>
              </div>

              <div className='notifications-actions'>
                <span className='results-pill'>
                  {notificacionesSinLeer} sin leer
                </span>

                <button
                  type='button'
                  className='btn btn-secondary'
                  onClick={marcarTodasLeidas}
                  disabled={notificacionesSinLeer === 0}
                >
                  Marcar todas como leídas
                </button>
              </div>
            </div>
          </div>

          <div className='notifications-list'>
            {notificacionesVisibles.length === 0 ? (
              <div className='empty-state improved-empty'>
                <strong>No tienes notificaciones.</strong>
                <span>Cuando ocurra una novedad importante aparecerá en esta sección.</span>
              </div>
            ) : (
              notificacionesVisibles.map((notificacion) => (
                <article
                  key={notificacion.id}
                  className={notificacion.leido ? 'notification-card read' : 'notification-card unread'}
                >
                  <div className='notification-icon'>
                    {notificacion.tipo === 'nuevo_incidente' && '🆕'}
                    {notificacion.tipo === 'cambio_estado' && '🔄'}
                    {notificacion.tipo === 'incidente_pendiente' && '⏰'}
                    {!['nuevo_incidente', 'cambio_estado', 'incidente_pendiente'].includes(notificacion.tipo) && '🔔'}
                  </div>

                  <div className='notification-content'>
                    <div className='notification-head'>
                      <h3>{notificacion.titulo}</h3>
                      <span>{formatearFechaNotificacion(notificacion.fecha)}</span>
                    </div>

                    <p>{notificacion.mensaje}</p>

                    {notificacion.incidenteTitulo && (
                      <small>Incidente: {notificacion.incidenteTitulo}</small>
                    )}
                  </div>

                  {!notificacion.leido && (
                    <button
                      type='button'
                      className='mark-read-btn'
                      onClick={() => marcarNotificacionLeida(notificacion.id)}
                    >
                      Marcar leída
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === 'admin' && isAdmin && (
        <section className='dashboard-page-section page-with-leaves'>
          <HojasCayendo />

          <div className='admin-panel-box'>
            <div className='consult-panel-header'>
              <div>
                <h3>Gestión de Estados - Administrador</h3>
                <p>
                  Desde este panel el administrador puede cambiar el estado de los incidentes,
                  agrupar reportes repetidos y consultar los grupos creados.
                </p>
              </div>

              <span className='results-pill'>
                {selectedIncidentesGrupo.length} seleccionados
              </span>
            </div>

            <div className='admin-actions-row'>
              <button
                type='button'
                className='btn btn-primary'
                onClick={agruparIncidentes}
                disabled={agrupando || selectedIncidentesGrupo.length < 2}
              >
                {agrupando ? 'Agrupando...' : 'Agrupar incidentes seleccionados'}
              </button>

              <button
                type='button'
                className='btn btn-secondary'
                onClick={() => setSelectedIncidentesGrupo([])}
              >
                Limpiar selección
              </button>
            </div>
          </div>

          <div className='admin-section-title'>
            <h3>Incidentes para gestionar</h3>
            <p>
              Selecciona dos o más incidentes repetidos para agruparlos. También puedes cambiar
              el estado individual o grupal.
            </p>
          </div>

          <div className='incident-cards improved-incident-list'>
            {incidentes.length === 0 ? (
              <div className='empty-state improved-empty'>
                <strong>No hay incidentes registrados.</strong>
                <span>Cuando los usuarios reporten incidentes aparecerán aquí.</span>
              </div>
            ) : (
              incidentes.map((item) => {
                const image = getImage(item)
                const estado = getEstado(item)
                const seleccionado = selectedIncidentesGrupo.includes(item.id)

                return (
                  <article
                    key={item.id}
                    className={seleccionado ? 'incident-card improved-card admin-selected-card' : 'incident-card improved-card'}
                  >
                    {image ? (
                      <img
                        className='incident-card-image'
                        src={image}
                        alt={getTitulo(item)}
                      />
                    ) : (
                      <div className='incident-card-image no-image'>
                        Sin imagen
                      </div>
                    )}

                    <div className='incident-card-content'>
                      <div className='incident-card-top'>
                        <div>
                          <label className='admin-check-row'>
                            <input
                              type='checkbox'
                              checked={seleccionado}
                              onChange={() => toggleSeleccionAgrupar(item.id)}
                            />
                            Seleccionar para agrupar
                          </label>

                          <h3>{getTitulo(item)}</h3>
                        </div>

                        <span className={`status-badge ${getEstadoClass(estado)}`}>
                          {getEstadoIcono(estado)} {estado}
                        </span>
                      </div>

                      <p>
                        {getDescripcion(item).length > 120
                          ? `${getDescripcion(item).slice(0, 120)}...`
                          : getDescripcion(item)}
                      </p>

                      <div className='incident-meta'>
                        <span><strong>Tipo:</strong> {getCategoria(item)}</span>
                        <span><strong>Zona:</strong> {getZonaUniversidad(item)}</span>
                        <span><strong>Ubicación:</strong> {getUbicacion(item)}</span>
                        <span><strong>Usuario:</strong> {getUsuario(item)}</span>
                        <span><strong>Fecha:</strong> {getFecha(item)}</span>
                        <span><strong>Actualización:</strong> {getFechaActualizacionEstado(item)}</span>

                        {item.grupoId ? (
                          <span><strong>Grupo:</strong> {item.grupoId}</span>
                        ) : (
                          <span><strong>Grupo:</strong> Sin agrupar</span>
                        )}
                      </div>

                      <div className='estado-atencion-control'>
                        <label>
                          Cambiar estado de atención
                          <select
                            value={estado}
                            onChange={(event) => actualizarEstadoAtencion(item, event.target.value)}
                            disabled={updatingEstadoId === item.id}
                          >
                            {estadosAtencion.map((estadoItem) => (
                              <option key={estadoItem} value={estadoItem}>
                                {estadoItem}
                              </option>
                            ))}
                          </select>
                        </label>

                        {item.grupoId && (
                          <small>
                            Este incidente pertenece a un grupo. Al cambiar el estado,
                            se actualizarán todos los incidentes agrupados.
                          </small>
                        )}
                      </div>

                      <button
                        type='button'
                        className='btn btn-secondary detail-btn'
                        onClick={() => setDetalleIncidente(item)}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>
      )}

      {activeTab === 'grupos' && isAdmin && (
        <section className='dashboard-page-section page-with-leaves'>
          <HojasCayendo />

          <div className='admin-section-title grouped-title'>
            <h3>Incidentes agrupados</h3>
            <p>
              En esta sección se visualizan los incidentes que fueron agrupados por el administrador.
              Cuando se cambia el estado de uno de ellos, todos los incidentes del mismo grupo se actualizan.
            </p>
          </div>

          <div className='grouped-incidents-grid'>
            {gruposIncidentes.length === 0 ? (
              <div className='empty-state improved-empty'>
                <strong>No hay incidentes agrupados.</strong>
                <span>
                  Ve al Panel administrador, selecciona dos o más incidentes repetidos y presiona
                  “Agrupar incidentes seleccionados”.
                </span>
              </div>
            ) : (
              gruposIncidentes.map((grupo) => (
                <article className='group-card' key={grupo.grupoId}>
                  <div className='group-card-header'>
                    <div>
                      <h4>{grupo.grupoId}</h4>
                      <p>{grupo.total} incidentes agrupados</p>
                    </div>

                    <span className={`status-badge ${getEstadoClass(grupo.estado)}`}>
                      {getEstadoIcono(grupo.estado)} {grupo.estado}
                    </span>
                  </div>

                  <div className='group-list'>
                    {grupo.items.map((item) => (
                      <div className='group-item' key={item.id}>
                        <strong>{getTitulo(item)}</strong>
                        <span>
                          {getZonaUniversidad(item)} · {getCategoria(item)} · {getFecha(item)}
                        </span>
                        <small>
                          Usuario: {getUsuario(item)}
                        </small>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {showMap && (
        <div className='map-overlay'>
          <div className='map-modal improved-map-modal'>
            <div className='map-header'>
              <div>
                <h2>Seleccionar ubicación</h2>
                <p>
                  El punto azul muestra tu ubicación actual. El marcador indica el punto
                  seleccionado para el incidente.
                </p>
              </div>

              <button
                type='button'
                className='close-map'
                onClick={() => setShowMap(false)}
              >
                ×
              </button>
            </div>

            {mapLoading && (
              <div className='map-loading-message'>
                Buscando tu ubicación actual...
              </div>
            )}

            <div className='map-container-box'>
              <MapContainer
                key={`${currentPosition?.lat || selectedPosition?.lat || 1.6144}-${currentPosition?.lng || selectedPosition?.lng || -75.6062}`}
                center={
                  selectedPosition
                    ? [selectedPosition.lat, selectedPosition.lng]
                    : currentPosition
                      ? [currentPosition.lat, currentPosition.lng]
                      : [1.6144, -75.6062]
                }
                zoom={selectedPosition || currentPosition ? 18 : 15}
                className='incident-map'
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />

                {currentPosition && (
                  <Marker
                    position={[currentPosition.lat, currentPosition.lng]}
                    icon={userLocationIcon}
                  />
                )}

                <LocationSelector
                  position={selectedPosition}
                  setPosition={setSelectedPosition}
                />
              </MapContainer>
            </div>

            <div className='map-help-box'>
              <strong>Cómo usar el mapa:</strong>
              <span>
                Primero usa GPS para detectar tu ubicación. Si el incidente está en otro punto,
                haz clic sobre el mapa y luego presiona Guardar ubicación.
              </span>
            </div>

            {(selectedPosition || currentPosition) && (
              <div className='selected-coords'>
                <span>
                  <strong>Latitud:</strong>{' '}
                  {(selectedPosition?.lat || currentPosition?.lat).toFixed(6)}
                </span>

                <span>
                  <strong>Longitud:</strong>{' '}
                  {(selectedPosition?.lng || currentPosition?.lng).toFixed(6)}
                </span>
              </div>
            )}

            <div className='map-actions'>
              <button
                type='button'
                className='cancel-map'
                onClick={() => setShowMap(false)}
              >
                Cancelar
              </button>

              <button
                type='button'
                className='save-map'
                onClick={guardarUbicacionMapa}
              >
                Guardar ubicación
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleIncidente && (
        <div className='detail-overlay'>
          <section className='detail-modal'>
            <button
              type='button'
              className='close-detail'
              onClick={() => setDetalleIncidente(null)}
            >
              ×
            </button>

            <div className='detail-image'>
              {getImage(detalleIncidente) ? (
                <img
                  src={getImage(detalleIncidente)}
                  alt={getTitulo(detalleIncidente)}
                />
              ) : (
                <div className='detail-no-image'>
                  Sin imagen registrada
                </div>
              )}
            </div>

            <div className='detail-info'>
              <span className={`status-badge ${getEstadoClass(getEstado(detalleIncidente))}`}>
                {getEstadoIcono(getEstado(detalleIncidente))} {getEstado(detalleIncidente)}
              </span>

              <h2>{getTitulo(detalleIncidente)}</h2>

              <p>{getDescripcion(detalleIncidente)}</p>

              <div className='detail-data'>
                <div>
                  <strong>Tipo de incidente</strong>
                  <span>{getCategoria(detalleIncidente)}</span>
                </div>

                <div>
                  <strong>Estado de atención</strong>
                  <span>{getEstado(detalleIncidente)}</span>
                </div>

                <div>
                  <strong>Grupo</strong>
                  <span>{detalleIncidente.grupoId || 'Sin agrupar'}</span>
                </div>

                <div>
                  <strong>Última actualización</strong>
                  <span>{getFechaActualizacionEstado(detalleIncidente)}</span>
                </div>

                <div>
                  <strong>Zona de la universidad</strong>
                  <span>{getZonaUniversidad(detalleIncidente)}</span>
                </div>

                <div>
                  <strong>Ubicación</strong>
                  <span>{getUbicacion(detalleIncidente)}</span>
                </div>

                <div>
                  <strong>Fecha y hora</strong>
                  <span>{getFecha(detalleIncidente)}</span>
                </div>

                <div>
                  <strong>Usuario</strong>
                  <span>{getUsuario(detalleIncidente)}</span>
                </div>

                <div>
                  <strong>Latitud</strong>
                  <span>
                    {detalleIncidente.latitud
                      ? Number(detalleIncidente.latitud).toFixed(6)
                      : 'No registrada'}
                  </span>
                </div>

                <div>
                  <strong>Longitud</strong>
                  <span>
                    {detalleIncidente.longitud
                      ? Number(detalleIncidente.longitud).toFixed(6)
                      : 'No registrada'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
      {showCamera && (
        <div className='camera-overlay'>
          <div className='camera-modal'>
            <div className='camera-header'>
              <div>
                <h2>Tomar fotografía</h2>
                <p>
                  Apunta la cámara hacia el incidente y presiona “Capturar foto”.
                </p>
              </div>

              <button
                type='button'
                className='close-camera'
                onClick={cerrarCamara}
              >
                ×
              </button>
            </div>

            <div className='camera-preview-box'>
              <video
                ref={videoRef}
                className='camera-video'
                autoPlay
                playsInline
                muted
              />

              <canvas ref={canvasRef} className='camera-canvas' />
            </div>

            <div className='camera-actions'>
              <button
                type='button'
                className='cancel-camera-btn'
                onClick={cerrarCamara}
              >
                Cancelar
              </button>

              <button
                type='button'
                className='capture-camera-btn'
                onClick={tomarFoto}
              >
                📷 Capturar foto
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}

export default Dashboard