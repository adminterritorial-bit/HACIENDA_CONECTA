# Consolidación normativa tributaria — corte 2026

## Estado del expediente normativo

La aplicación usa un registro jurídico versionado. Una norma localizada no se convierte automáticamente en regla de cálculo: primero debe extraerse el artículo operativo, compararse contra la norma base, determinarse vigencia y obtener validación de Hacienda/Jurídica.

### Municipal

| Norma | Función en el sistema | Estado |
|---|---|---|
| Acuerdo 013 de 2021 | Estatuto Tributario base suministrado | Base validada para extracción |
| Acuerdo 002 de 2022 | Modificación del Estatuto | Fuente oficial localizada; artículos pendientes de extracción y conciliación |
| Acuerdo 009 de 2022 | Modificación del Estatuto | Fuente oficial localizada; artículos pendientes de extracción y conciliación |
| Acuerdo 005 de 2024 | Alivios tributarios transitorios | Regla histórica expirada, no aplicable a 2026 |

El Acuerdo 005 de 2024 concedió alivios temporales para Predial e ICA/Avisos y Tableros sobre obligaciones pendientes hasta 31 de diciembre de 2023. Los beneficios operaron entre agosto y octubre de 2024 y no deben reaplicarse en liquidaciones 2026.

### Parámetros nacionales 2026

La Resolución DIAN 000238 de 2025 fijó la UVT 2026 en **$52.374**. El parámetro se encuentra cargado en la configuración base y debe quedar registrado junto con cada cálculo que dependa de UVT.

## Conflictos jurídicos abiertos

### Periodicidad RETEICA
La fuente municipal suministrada contiene referencias no uniformes a periodicidad mensual y bimestral. La aplicación no resolverá esta diferencia por inferencia. La periodicidad productiva queda bloqueada hasta concepto/documento de Hacienda que determine la regla vigente para la vigencia correspondiente.

### Calendario tributario 2026
No se debe inferir una fecha de vencimiento 2026 usando solamente fechas del Estatuto 2021. Debe cargarse el acto administrativo/calendario vigente de 2026 y versionarse.

### Reglas modificadas en 2022
Los Acuerdos 002 y 009 de 2022 están registrados como enmiendas, pero ninguna regla afectada se activa hasta completar extracción artículo por artículo y matriz "antes / modificación / regla consolidada / vigencia".

## Criterio de activación

Una regla puede pasar a ACTIVE_VALIDATED solamente cuando tenga:
1. fuente oficial;
2. artículo exacto;
3. vigencia;
4. fórmula o parámetro inequívoco;
5. efecto sobre reglas anteriores;
6. validación de Hacienda/Jurídica;
7. casos de prueba;
8. hash/versionado de configuración.

## Módulos priorizados

Fase 1:
- Registro Tributario;
- ICA + Avisos y Tableros;
- RETEICA;
- pagos y conciliación;
- firma/autenticación reforzada;
- certificados verificables.

Fase 2:
- Predial;
- paz y salvo;
- acuerdos de pago;
- devoluciones/compensaciones;
- fiscalización;
- notificaciones y expediente.

Fase 3:
- demás impuestos, tasas, contribuciones, estampillas y rentas del catálogo municipal.

## Pendientes documentales requeridos para cierre 2026

- acto/calendario tributario 2026;
- resoluciones vigentes de agentes retenedores/autorretenedores;
- texto íntegro y validado de los Acuerdos 002 y 009 de 2022;
- acuerdos tributarios posteriores a 2024 que no estén publicados/indexados en las fuentes consultadas;
- reglamentación interna de presentación electrónica y firma;
- convenios/condiciones de recaudo y pasarela;
- reglamento vigente de cartera/acuerdos de pago;
- fuente maestra predial/catastral y reglas de interoperabilidad.

Hasta que estos documentos estén disponibles, Hacienda Conecta funciona como **MVP técnico y normativo controlado**, no como liquidación oficial productiva.
