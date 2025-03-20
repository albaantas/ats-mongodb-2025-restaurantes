# TAREAS OBLIGATORIAS (HASTA 4 PUNTOS)

## ESTAS TAREAS DEBEN REALIZARSE OBLIGATORIAMENTE PARA APROBAR LA PRÁCTICA:

### 1. DISEÑO DEL ESQUEMA DE LA BASE DE DATOS  

- **Analizar la estructura de los datos y determinar el tipo de relación entre restaurantes e inspecciones**
  - Relación **One-to-Many** (Un restaurante puede tener múltiples inspecciones).

- **Justificar la elección de referencias (`restaurant_id`) en lugar de documentos embebidos.**
  - Hemos optado por la elección de referencias (`restaurant_id`), ya que si lo hacemos con documentos embebidos, el tamaño del documento crecería demasiado con cada inspección nueva, lo que supondría una afectación al rendimiento.
  - Si los datos de los restaurantes o inspecciones cambian, solo es necesario modificar un documento, evitando así errores o la duplicación de datos.

- **Definir un esquema de validación para ambas colecciones.**
```javascript
db.createCollection("restaurants", { //1.2
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "address", "rating", "type_of_food", "url"],
        properties: {
          name: { bsonType: "string", description: "Nombre del restaurante" },
          address: {
            bsonType: "object",
            required: ["street", "city", "postcode"],
            properties: {
              street: { bsonType: "string", description: "Calle" },
              city: { bsonType: "string", description: "Ciudad" },
              postcode: { bsonType: "string", description: "Código postal" }
            }
          },
          rating: { bsonType: "float", minimum: 0, maximum: 10, description: "Calificación del restaurante" },
          type_of_food: { bsonType: "string", description: "Tipo de comida" },
          url: { bsonType: "string", pattern: "^https?:\\/\\/.+", description: "URL del restaurante" }
        }
      }
    }
  });
```
```javascript
 db.createCollection("inspections", { //1.2
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["restaurant_id", "certificate_number", "date", "result", "sector", "address"],
        properties: {
          restaurant_id: { bsonType: "objectId", description: "ID del restaurante" },
          certificate_number: { bsonType: "int", description: "Número de certificado" },
          date: { bsonType: "date", description: "Fecha de la inspección" },
          result: { bsonType: "string", description: "Resultado de la inspección" },
          sector: { bsonType: "string", description: "Sector de la inspección" },
          address: {
            bsonType: "object",
            required: ["street", "city", "postcode"],
            properties: {
              street: { bsonType: "string", description: "Calle" },
              city: { bsonType: "string", description: "Ciudad" },
              postcode: { bsonType: "string", description: "Código postal" }
            }
          }
        }
      }
    }
  });

### 2. IMPLEMENTACIÓN DE CONSULTAS EN MONGODB  

- Buscar todos los restaurantes de un tipo de comida específico (ej. "Chinese").
```javascript
db.restaurants.find({"type_of_food": "Chinese"})
```
- Listar las inspecciones con violaciones, ordenadas por fecha.
```javascript
  db.inspeccions.find({result: "No Violation Issued"})
```
- Encontrar restaurantes con una calificación superior a 4.
```javascript
  db.restaurants.find({"rating": ({$gt: 4} )})
```
### 3. USO DE AGREGACIONES  

- Agrupar restaurantes por tipo de comida y calcular la calificación promedio.
```javascript
db.restaurants.aggregate([ 
    {$group: {_id: "$type_of_food", promedio: {$avg: "$rating"}}}
  
  ])
```
- Contar el número de inspecciones por resultado y mostrar los porcentajes.
```javascript
db.inspeccions.aggregate([ 
    {$group: {_id: "$result", total: {$sum: 1}}},
    {$group: {_id: null, total_inspecciones: {$sum: "$total"}, result: {$push: {result: "$_id", total: "$total"}}}},
    {$unwind: "$result"},
    {$project: {_id: 0, result: "$result.result", total: "$result.total", porcentaje: {$multiply: [{$divide: ["$result.total", "$total_inspecciones"]}, 100]}}}
  
  ])
```
- Unir restaurantes con sus inspecciones utilizando `$lookup`.
```javascript
b.restaurants.aggregate([ 
  
    { $addFields: {
        stringId: { $toString: "$_id" }
        } },
    {
        $lookup: {
          from: "inspeccions", 
          localField: "stringId", 
          foreignField: "restaurant_id", 
          as: "inspecciones" 
        }
      },
      { $limit: 1 } 
    ]);
```
---

# TAREAS AVANZADAS (HASTA 6 PUNTOS)

Estas tareas son más complejas y exploratorias y por lo tanto más abiertas:

## 1. OPTIMIZACIÓN DEL RENDIMIENTO  

- **Identificación de las consultas más frecuentes:**
  - Buscar restaurantes por tipo de comida.
  - Buscar restaurantes por valoraciones.
  - Buscar inspecciones por resultados.

- **Implementación de índices:**
  - Se proponen los siguientes índices para optimizar estas consultas con posibles ejemplos:
```javascript
    db.restaurants.find({"type_of_food": "Chinese"}).explain("executionStats");
    db.restaurants.createIndex({"type_of_food": 1});

    db.restaurants.find({"rating": {$gt: 5}}).explain("executionStats");
    db.restaurants.createIndex({"rating": -1});

    db.inspeccions.find({"result": "Pass"}).explain("executionStats");
    db.inspeccions.createIndex({"result": 1});
```

- **Comparar el rendimiento antes y después de crear los índices utilizando `explain()`.**

### RESULTADO PRIMERA CONSULTA:  

- Como podemos observar en las capturas, existe un gran cambio en los documentos examinados, puesto que pasamos de **2548 documentos a 174**, por lo tanto, existe una reducción significativa.



### RESULTADO SEGUNDA CONSULTA:  

- Como en el anterior caso, el mayor cambio observado es la reducción de documentos examinados, pasando de **2548 a 649**.



### RESULTADO TERCERA CONSULTA:  

- Como podemos observar en las imágenes, al hacer uso de los índices hemos reducido a la mitad el tiempo de ejecución de **4 a 2**. Además, también hemos reducido el número de documentos examinados.



---

## 2. ESTRATEGIAS DE ESCALABILIDAD (JUSTIFICACIÓN TEÓRICA CON EJEMPLOS PRÁCTICOS)

### PROPUESTA DE ESTRATEGIA DE SHARDING  

Nuestra propuesta es implementar un **sharding basado en la clave `restaurant_id`** en la colección de inspecciones. Esto permite distribuir equitativamente las inspecciones entre los shards, reduciendo la carga y optimizando las consultas por restaurante. Hemos escogido la colección de inspecciones porque creemos que esta crecerá mucho más que la de restaurantes, puesto que se hacen más inspecciones que creación de nuevos restaurantes.

### DISEÑO DEL ESQUEMA DE REPLICACIÓN  

Proponemos un esquema de replicación con al menos **tres nodos:**

- **Nodo primario:** Acepta todas las operaciones de escritura.
- **Nodos secundarios:** Mantienen copias exactas de los datos y manejan operaciones de lectura para reducir la carga del primario.
- **Failover:** Si el nodo primario falla, los secundarios eligen automáticamente un nuevo primario, asegurando la continuidad del servicio.

Con este diseño conseguimos mantener la **disponibilidad** si alguno de los servidores de la base de datos falla. Además, conseguimos **distribuir la carga** a varios nodos secundarios para reducir esta del nodo primario.

### ANÁLISIS DE CUELLOS DE BOTELLA  

- **Consultas:** Si hay demasiados restaurantes o inspecciones, las consultas pueden ser lentas.  
  **Solución:** Crear índices y usar sharding para reducir el tiempo de búsqueda.  

- **En lecturas y escrituras:** Si se producen muchas operaciones en un solo servidor, este puede llegar a sobrecargarse.  
  **Solución:** Usar **sharding** para distribuir los datos y la **replicación** para balancear la carga entre los nodos secundarios mejorando el rendimiento general.  

- **Fallos en el servidor:** Si el servidor principal falla, el sistema deja de funcionar.  
  **Solución:** Usar **replicación** para mantener la disponibilidad del sistema.

### NOTAS
Todas las consultas se encuentran en scripts/consultas.js
