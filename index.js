const { EventHubConsumerClient , earliestEventPosition } = require("@azure/event-hubs");
const azStorage = require('azure-storage');
const uuid = require('uuid');

const comsumerGroup = process.env.comsumerGroup
const ioThubConnectionString = process.env.ioThubConnectionString
const tableConnectionString = process.env.tableConnectionString

function zeroPadding(date){

    let num = parseInt(2000000000000) - parseInt( Date.parse(date))
    return ('0000000000' + num).slice(-13);

}

async function AddEntityToTable(message){

    const tableSvc = azStorage.createTableService(tableConnectionString);
    const entGen = azStorage.TableUtilities.entityGenerator;

    const iothubConnectionDeviceId = message.systemProperties['iothub-connection-device-id'];
    const machineTemperature = message.body.machine.temperature;
    const machinePressure = message.body.machine.pressure;
    const ambientTemperature = message.body.ambient.temperature;
    const ambienthumidity = message.body.ambient.humidity;
    const timeCreated = message.body.timeCreated;

    var task = {
        PartitionKey: entGen.String(iothubConnectionDeviceId),
        RowKey: entGen.String(zeroPadding(timeCreated)),
        machineTemperature: entGen.String(machineTemperature),
        machinePressure: entGen.String(machinePressure),
        ambientTemperature: entGen.String(ambientTemperature),
        ambienthumidity: entGen.String(ambienthumidity),
        timeCreated: entGen.DateTime(timeCreated)
    };
    await tableSvc.insertEntity('devicemetrics',task, function (error, result, response) {
        if(!error){
            console.log(error)
        }
    });
}

async function main() {

    try {

        const consumerClient = new EventHubConsumerClient(comsumerGroup,ioThubConnectionString);
        console.log('Successfully created the EventHubConsumerClient from IoT Hub event hub-compatible connection string.');

        const partitionIds = await consumerClient.getPartitionIds();
        console.log('The partition ids are: ', partitionIds);

        consumerClient.subscribe({
            processEvents: async (events, context) => {
                for (let i = 0; i < events.length; ++i) {
                      await AddEntityToTable(events[i])
                };
            },
            processError: async (err, context) => {
                console.error(err.message || err);
            }
        });
    } catch (ex) {
        console.error(ex.message || ex);
    }

}

main().catch((err) => {
    console.log("Error occurred: ", err);
});    
