# Línea base jurídica y funcional

## Fuente municipal suministrada

La fuente inicial es el Acuerdo Municipal 013 de 2021, Estatuto Tributario de San Pedro, Valle del Cauca. La aplicación no debe codificar reglas tributarias como constantes irreversibles: toda regla debe tener vigencia, fuente jurídica, estado de validación y responsable de aprobación.

El Estatuto suministrado contempla, entre otros, impuesto predial unificado, industria y comercio (ICA), avisos y tableros, RETEICA y autorretenciones, publicidad exterior visual, alumbrado público, espectáculos públicos, rifas y juegos, delineación urbana, sobretasa a la gasolina, sanciones, fiscalización, devoluciones, cobro y acuerdos de pago.

### Declaraciones electrónicas

El artículo 606 permite que la Administración autorice la presentación de declaraciones y pagos por medios electrónicos, con las condiciones y seguridades que establezca el reglamento, y señala que cuando se adopten dichos medios no se requiere firma autógrafa para la validez de la declaración.

Por ello, una imagen pegada de la firma no debe ser la única evidencia de firma. La plataforma debe conservar identidad verificada, consentimiento, hash del documento, segundo factor, fecha/hora, operación firmada y trazabilidad. La imagen de firma puede ser una representación visual opcional.

### Firmantes

El artículo 589 exige identificación suficiente del declarante, factores de la base gravable y firmas que correspondan. El artículo 590 regula los efectos de la firma de contador o revisor fiscal. El modelo debe admitir firmantes por rol y reglas por vigencia.

### Reserva tributaria

Los artículos 591 y siguientes establecen reserva sobre la información tributaria. La autorización debe aplicarse por expediente y registro; las analíticas públicas deben ser agregadas y no exponer datos fiscales individualizables.

### RETEICA: inconsistencia que no debe resolver el software por inferencia

La documentación suministrada contiene una diferencia relevante:
- el artículo 585 literal d describe declaración mensual de retenciones;
- el artículo 149 habla de los quince días calendario posteriores al período y/o bimestre;
- el artículo 159 define el período fiscal de la retención como bimestral;
- la plantilla suministrada se denomina Declaración Bimestral de RETEICA.

La periodicidad productiva debe quedar definida por una regla versionada y aprobada formalmente por Hacienda/Jurídica con el calendario vigente.

## Modificaciones posteriores

La revisión pública identificó modificaciones posteriores al Acuerdo 013 de 2021, incluyendo el Acuerdo Municipal 009 de 2022. Antes de producción debe construirse un texto tributario consolidado por vigencia. Ningún cálculo 2026 debe presumir que el texto 2021 aislado sigue íntegramente vigente.

## Marco nacional mínimo a incorporar en la matriz jurídica

- Constitución Política: legalidad tributaria, habeas data, debido proceso y principios tributarios.
- Ley 14 de 1983: ICA.
- Ley 44 de 1990: impuesto predial.
- Ley 527 de 1999 y reglamentación compilada: mensajes de datos y firma electrónica.
- Ley 1581 de 2012 y Decreto 1074 de 2015: protección de datos personales.
- Ley 1437 de 2011, modificada por Ley 2080 de 2021: actuaciones y notificaciones por medios electrónicos.
- Ley 2052 de 2020 y Decreto 088 de 2022: racionalización, digitalización y automatización de trámites.
- Decreto 620 de 2020 y reglamentación vigente: Servicios Ciudadanos Digitales, cuando aplique.
- Decreto 767 de 2022: Política de Gobierno Digital.
- Resolución MinTIC 1519 de 2020: accesibilidad, publicación, seguridad y sede electrónica.
- Resolución MinTIC 500 de 2021 y sus modificaciones; Anexo 1 actualizado por Resolución 2277 de 2025: Modelo de Seguridad y Privacidad de la Información.
- Normativa archivística vigente sobre documento y expediente electrónico, retención y preservación.
- Estatuto Tributario Nacional en los asuntos a los que el Estatuto Municipal remite.

## Regla de implementación

Toda regla tributaria debe guardar como mínimo:
1. tributo y concepto;
2. vigencia inicial y final;
3. fórmula o parámetro;
4. fuente jurídica y artículo;
5. fecha de aprobación;
6. responsable de validación;
7. huella de la configuración;
8. pruebas de regresión.

Una regla validada no se edita retroactivamente; se crea una nueva versión.
