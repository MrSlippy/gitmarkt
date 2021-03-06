class HttpData {

    constructor(config, fetcher) {
        this.config = config
        this.fetcher = !fetcher ? (endpoint, config) => window.fetch(endpoint, config) : fetcher
    }

    async get() {
        return JSON.parse(await (await this.fetcher(this.config.endpoint)).text())
    }

    async post(data) {
        const response = await this.fetcher(this.config.endpoint,
            {
                method: 'POST',
                body: data
                //Default is multipart/formdata
            }
        )
        if (response.ok) {
            if (this.config.mode === DataModes.Read ||
                this.config.mode === DataModes.ReadWrite) {
                const last = await this.get()

                for (const callback of this.config.callbacks) {
                    callback(last)
                }

                this.config.last = last
            }
            
            return response
        }

        throw new Error('Post failed.')
    }
}

export class DataConfig {

    constructor(config, fetcher) {
        this.config = config
        this.fetcher = fetcher
    }

    async push(datakey, data) {
        const dataconfig = this.config[datakey]
        let result

        switch (dataconfig.type) {
            case DataOrigin.Http:
                result = await
                    new HttpData(
                        dataconfig,
                        this.fetcher
                    ).post(data)
                break
            default:
                throw new Error('Unsupported data type')
        }

        return result
    }

    async get(datakey) {
        const dataconfig = this.config[datakey]
        let result

        switch (dataconfig.type) {
            case DataOrigin.Http:
                result = await
                    new HttpData(
                        dataconfig,
                        this.fetcher
                    ).get()
                break
            default:
                throw new Error('Unsupported data type')
        }

        return result
    }

    async init() {
        for (const datakey in this.config) {
            const config = this.config[datakey]

            if (config.mode === DataModes.Read ||
                config.mode === DataModes.ReadWrite) {
                this.config[datakey].last = await this.get(datakey)
            }

        }
    }

    subscribe(datakey, callback) {
        const data = this.config[datakey]

        if (!data.callbacks) {
            data['callbacks'] = []
        }

        data.callbacks.push(callback)

        callback(data.last)
    }

}

export const DataOrigin = {
    Http: 'http'
}
export const DataModes = {
    Read: 'read',
    Write: 'Write',
    ReadWrite: 'ReadWrite'
}
