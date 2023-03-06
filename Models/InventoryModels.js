import mongoose from 'mongoose'
const inventorySchema = mongoose.Schema({
    idDrug:{
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'Product'
    },
    lotNumber:{
        type: String,
        require: true
    },
    count:{
        type: Number,
        require: true,
        default: 0
    },
    expDrug:{
        type: Date,
        require: true
    },
    importStock:[ 
        {
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                require: true,
                ref: 'ImportStock'
            },
            importCode:{
                type: String,
                required: true,
            }
        }
    ],
    exportStock:[ 
        {
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                require: true,
                ref: 'ExportStock'
            },
            exportCode:{
                type: String,
                required: true,
            }
        }
    ],
},{
    timestamps: true
}
)
const Inventory = mongoose.model("Inventory", inventorySchema)
export default Inventory