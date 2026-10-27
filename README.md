# El Banquillo · Panel de ventas y publicidad

Panel de seguimiento para el libro: ventas de KDP, campañas de Amazon Ads, términos de búsqueda, redes (YouTube Shorts, TikTok e Instagram) con sus enlaces de afiliado, caja, reseñas y ranking, comparado con el plan de negocio v3.0 (escenarios worst, normal y best).

## Privacidad
Los datos que importas se guardan **solo en el navegador** (localStorage). No hay servidor ni base de datos. Si cambias de equipo o borras los datos del navegador, usa Datos › Copia de seguridad. La web desplegada contiene únicamente el plan (cifras previstas), no tus ventas.

## Cómo alimentarlo (una vez por semana)
1. **KDP**: Informes › Ventas (o Panel de control de regalías) › descarga CSV/XLSX con el detalle por fecha.
2. **Amazon Ads**: Informes › crea un informe de *Campañas patrocinadas* con desglose **diario** (campañas) y otro de *Términos de búsqueda*; exporta desde el lanzamiento.
3. Pestaña **Datos**: arrastra el archivo. El panel detecta el tipo y propone las columnas; corrige si hace falta y pulsa Importar. Reimportar un periodo actualiza las filas, no las duplica. El informe de términos sustituye al anterior.
4. **Redes**: YouTube Studio › Estadísticas › Exportar vista actual (CSV por día) y TikTok Studio › Estadísticas › Descargar datos. Si el archivo no dice de qué plataforma es, elígela al importar.
5. **Afiliados de Amazon**: Informes › Tendencias diarias filtrado por ID de seguimiento (`banquillo-yt-21` para YouTube, `banquillo-tk-21` para TikTok, `banquillo-ig-21` para Instagram), en CSV. La comisión («Tarifas por publicidad») se suma a los ingresos, al neto y a la caja; las ventas del libro por esos enlaces ya cuentan como regalía en el informe de KDP.
6. Anota a mano reseñas, BSR, gastos, acciones y cambios de precio (y, si hace falta, visualizaciones o afiliados de un día).

Los formatos reales de exportación de Amazon pueden variar: por eso hay una pantalla de mapeo de columnas, que se recuerda para la siguiente vez.

## Desarrollo
```
npm install
npm run dev      # servidor local
npm test         # pruebas de importación y métricas
npm run build    # genera dist/
```
`scripts/shots.mjs` saca capturas con Playwright; `scripts/verify-plan.mjs` comprueba que el plan transcrito cuadra con los totales del PDF.

## Acceso con Google
`src/config.js` guarda el ID de cliente de OAuth (`GOOGLE_CLIENT_ID`) y las cuentas permitidas (`ALLOWED_EMAILS`). Con el ID vacío no se pide inicio de sesión. Para activarlo: Google Cloud Console › APIs y servicios › Credenciales › ID de cliente de OAuth › Aplicación web, con `https://banquillo-dashboard.vercel.app` (y `http://localhost:5173` para desarrollo) como orígenes JavaScript autorizados.
Es una puerta de acceso en el navegador: valida el token de Google y la cuenta, pero no protege el código estático, que solo contiene el plan.
