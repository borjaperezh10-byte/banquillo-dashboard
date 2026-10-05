# El Banquillo · Panel de ventas y publicidad

Panel de seguimiento para el libro: ventas de KDP, campañas de Amazon Ads, términos de búsqueda, caja, reseñas y ranking, comparado con el plan de negocio v3.0 (escenarios worst, normal y best).

## Privacidad
Los datos que importas se guardan **solo en el navegador** (localStorage). No hay servidor ni base de datos. Si cambias de equipo o borras los datos del navegador, usa Datos › Copia de seguridad. La web desplegada contiene únicamente el plan (cifras previstas), no tus ventas.

## Cómo alimentarlo (una vez por semana)
1. **KDP**: Informes › Ventas (o Panel de control de regalías) › descarga CSV/XLSX con el detalle por fecha.
2. **Amazon Ads**: Informes › crea un informe de *Campañas patrocinadas* con desglose **diario** (campañas) y otro de *Términos de búsqueda*; exporta desde el lanzamiento.
3. Pestaña **Datos**: arrastra el archivo. El panel detecta el tipo y propone las columnas; corrige si hace falta y pulsa Importar. Reimportar un periodo actualiza las filas, no las duplica. El informe de términos sustituye al anterior.
4. Anota a mano reseñas, BSR, gastos, acciones y cambios de precio.

Los formatos reales de exportación de Amazon pueden variar: por eso hay una pantalla de mapeo de columnas, que se recuerda para la siguiente vez.

## Desarrollo
```
npm install
npm run dev      # servidor local
npm test         # pruebas de importación y métricas
npm run build    # genera dist/
```
`scripts/shots.mjs` saca capturas con Playwright; `scripts/verify-plan.mjs` comprueba que el plan transcrito cuadra con los totales del PDF.
