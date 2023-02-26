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
    importCode:[ 
        {
            type: mongoose.Schema.Types.ObjectId,
            require: true,
            ref: 'ImportStock'
        }
    ],
    exportCode:[ 
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExportStock'
        }
    ],
},{
    timestamps: true
}
)
const Inventory = mongoose.model("Inventory", inventorySchema)
export default Inventory