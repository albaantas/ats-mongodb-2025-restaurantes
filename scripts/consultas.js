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

  db.restaurants.find({"type_of_food": "Chinese"}) // 2.1

  db.inspeccions.find({result: "No Violation Issued"}) //2.2

  db.restaurants.find({"rating": ({$gt: 4} )}) //2.3


  db.restaurants.aggregate([ //3.1
    {$group: {_id: "$type_of_food", promedio: {$avg: "$rating"}}}
  
  ])
  
  db.inspeccions.aggregate([ //3.2
    {$group: {_id: "$result", total: {$sum: 1}}},
    {$group: {_id: null, total_inspecciones: {$sum: "$total"}, result: {$push: {result: "$_id", total: "$total"}}}},
    {$unwind: "$result"},
    {$project: {_id: 0, result: "$result.result", total: "$result.total", porcentaje: {$multiply: [{$divide: ["$result.total", "$total_inspecciones"]}, 100]}}}
  
  ])


  db.restaurants.aggregate([ //3.3
  
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


  

    db.restaurants.find({"type_of_food": "Chinese"}).explain("executionStats");
    db.restaurants.createIndex({"type_of_food": 1});

    db.restaurants.find({"rating": {$gt: 5}}).explain("executionStats");
    db.restaurants.createIndex({"rating": -1});

    db.inspeccions.find({"result": "Pass"}).explain("executionStats");
    db.inspeccions.createIndex({"result": 1});
