const fs = require('fs');
const path = require('path');
const http = require('http');

class Clappity {
    constructor() {
        this.routes = {};
        this.middlewares = [];
    }

    use(middleware) {
        this.middlewares.push(middleware);
    }

    route(method, routePath, handler) {
        if (!this.routes[routePath]) {
            this.routes[routePath] = {};
        }
        this.routes[routePath][method] = handler;
        this.log(`Route registered: [${method}] ${routePath}`);
    }

    serveClpFile(filePath, data = {}) {
        const fullPath = path.join(__dirname, filePath);
        this.log(`Loading template file: ${fullPath}`);

        try {
            let content = fs.readFileSync(fullPath, 'utf-8');
            this.log(`Template loaded: ${filePath}`);
            content = this.renderTemplate(content, data);
            this.log(`Template rendered successfully.`);
            return content;
        } catch (err) {
            this.log(`Error loading file ${filePath}: ${err.message}`);
            return `Error: Could not load file ${filePath}`;
        }
    }

    /**
     * @param {string} template
     * @param {{[key: string]: any}} data
     */
    renderTemplate(template, data) {
        this.log(`Processing template...`);

        let output = '';

        for (let i = 0; i < template.length; i++) {
            // If not template block, continue
            if (!(template[i] === '[' && template[i + 1] === '[')) {
                output += template[i];
                continue;
            }

            // If template block found, move inside
            for (i; template[i] === '[' || template[i] === ' '; i++) {}

            /**
             * @type {string}
             * @description The type of template block it is
             */
            let templateType = '';
            for (
                i;
                template[i] !== ' ' &&
                template[i] !== '\n' &&
                template[i] !== ']';
                i++
            ) {
                templateType += template[i];
            }

            switch (templateType) {
                case 'section': {
                    // Move into section content block
                    for (i; template[i] !== '{'; i++) {}
                    i++; // Currently at the '{' character, need to move inside that block

                    let sectionContent = '';
                    let insideBlock = false;
                    for (i; template[i] !== '}' || insideBlock; i++) {
                        if (template[i] === '{') insideBlock = true;
                        if (template[i] === '}') insideBlock = false;
                        sectionContent += template[i];
                    }
                    i++; // Currently at the '}' character, need to move out of that block

                    output += this.renderTemplate(sectionContent.trim(), data);
                    break;
                }

                case 'if': {
                    // Skip spaces
                    for (i; template[i] === ' '; i++) {}

                    let condition = '';
                    for (i; template[i] !== ']'; i++) {
                        condition += template[i];
                    }
                    condition = condition.trim();

                    // Move into if content block
                    for (i; template[i] !== '{'; i++) {}
                    i++; // Currently at the '{' character, need to move inside that block

                    let ifContent = '';
                    for (i; template[i] !== '}'; i++) {
                        ifContent += template[i];
                    }
                    i++; // Currently at the '}' character, need to move out of that block

                    /** @type {boolean} */
                    let conditionalResult;
                    if (condition.startsWith('!')) {
                        // Negated condition
                        conditionalResult = !data[condition.slice(1)];
                    } else {
                        conditionalResult = !!data[condition];
                    }

                    if (conditionalResult) {
                        output += this.renderTemplate(ifContent.trim(), data);
                    }

                    break;
                }

                case 'for': {
                    // Skip spaces
                    for (i; template[i] === ' '; i++) {}

                    // Read value used in each iteration of loop
                    let value = '';
                    for (i; template[i] !== ' '; i++) {
                        value += template[i];
                    }

                    // Skip spaces
                    for (i; template[i] === ' '; i++) {}
                    // Skip 'in'
                    i += 2;
                    // Skip spaces
                    for (i; template[i] === ' '; i++) {}

                    var listName = '';
                    for (i; template[i] !== ']'; i++) {
                        listName += template[i];
                    }

                    listName = listName.trim();

                    // Move to content block
                    for (i; template[i] !== '{'; i++) {}
                    i++; // Currently at the '{' character, need to move inside that block

                    let forContent = '';
                    for (i; template[i] !== '}'; i++) {
                        forContent += template[i];
                    }
                    i++; // Currently at the '}' character, need to move out of that block

                    /** @type {any[]} */
                    const items = data[listName];

                    // If array doesn't exist, exit without rendering the for loop
                    if (!Array.isArray(items)) {
                        this.log(`Array not found: ${listName}`);
                        break;
                    }

                    for (const item of items) {
                        output += this.renderTemplate(
                            forContent.replaceAll(
                                new RegExp(`\\[\\[\\s*${value}\\s*\\]\\]`, 'g'),
                                item,
                            ),
                            data,
                        );
                    }

                    break;
                }

                default: {
                    // Move out of variable block
                    i++;

                    output += data[templateType.trim()]
                        ? data[templateType.trim()].toString()
                        : '';
                }
            }
        }

        this.log(`Template rendered successfully.`);
        return output;
    }

    parseBody(req, callback) {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            callback(body);
        });
    }

    listen(port) {
        const server = http.createServer((req, res) => {
            const method = req.method;
            const url = req.url.split('?')[0];

            this.log(`Incoming request: [${method}] ${url}`);

            // Apply middlewares
            for (const middleware of this.middlewares) {
                middleware(req, res);
            }

            const route = this.routes[url];
            if (route && route[method]) {
                const handler = route[method];
                if (method === 'POST') {
                    this.parseBody(req, (body) => {
                        req.body = body;
                        handler(req, res);
                    });
                } else {
                    handler(req, res);
                }
            } else {
                this.log(`404 Not Found: [${method}] ${url}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>');
            }
        });

        server.listen(port, () => {
            this.log(`Clappity server running on port ${port}`);
        });
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }
}

module.exports = Clappity;
