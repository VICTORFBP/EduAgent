#import "@preview/mitex:0.2.4": *
#import "/services/typst_templates/prueba_estandarizada.typ": conf-prueba, hoja-respuestas, recuadro, fragmento-lectura, opcion, tabla-formato, bloque-instrucciones
#import "/services/typst_templates/actividad.typ": lineas-respuesta, caja-respuesta, verdadero-falso, dibujo, grilla, seccion-clave

#show: doc => conf-prueba(
  titulo: "Taller de Ampliación de Fracciones",
  area: "Matematicas",
  grado: "5",
  tema: "Fracciones ampliacion ",
  instrucciones: [Completa las actividades para practicar la ampliación de fracciones y reflexiona sobre tu aprendizaje.],
  n_preguntas: 2,
  clave: none,
  doc,
)

== Introducción a la Ampliación de Fracciones


#fragmento-lectura[
La ampliación de fracciones es un concepto fundamental en matemáticas. Al ampliar una fracción multiplicamos tanto el numerador como el denominador por el mismo número. Esto nos ayuda a encontrar fracciones equivalentes que son más fáciles de comparar o sumar.
]


== Concepto Clave


#recuadro[
*Ampliación de Fracciones*
Para ampliar una fracción, multiplicamos su numerador y denominador por un mismo número. Por ejemplo, para ampliar #mi("\\frac{1}{2}") por 2, hacemos:
#mi("\\frac{1 \\times 2}{2 \\times 2} = \\frac{2}{4}").
]


== Práctica de Ampliación


#grilla(cols: 3, (
  [Amplía las siguientes fracciones:],
  [#mi("\\frac{1}{3} =") \_\_\_],
  [#mi("\\frac{2}{5} =") \_\_\_],
  [#mi("\\frac{3}{4} =") \_\_\_],
  [#mi("\\frac{5}{6} =") \_\_\_],
  [#mi("\\frac{1}{2} =") \_\_\_],
))


== Problemas Contextualizados


*1.* En una receta, necesitas #mi("\\frac{1}{4}") de taza de azúcar, pero solo tienes una taza medidora de #mi("\\frac{1}{2}"). ¿Cómo puedes ampliar la fracción para usar la taza medidora que tienes?

#lineas-respuesta(n: 5)

*2.* Juan tiene #mi("\\frac{3}{5}") de una pizza y quiere compartirla con su amigo. Si ambos quieren tener la misma cantidad, ¿cómo puede ampliar la fracción para dividirla equitativamente?

#lineas-respuesta(n: 5)

== Autoevaluación


#escala(
  ([Mucho], [Algo], [Poco], [Nada],),
  ([Entiendo cómo ampliar fracciones],
  [Puedo resolver problemas que incluyen fracciones ampliadas],
  [Me siento seguro al explicar a un compañero sobre ampliar fracciones],),
)
