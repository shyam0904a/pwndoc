import { Dialog, Notify } from 'quasar'
import Vue from 'vue'
import YAML from 'js-yaml'
import * as xml2js from 'xml2js';


import draggable from 'vuedraggable'
import BasicEditor from 'components/editor';
import CustomFields from 'components/custom-fields'
import DataService from '@/services/data'
import Utils from '@/services/utils'


import CompanyService from '@/services/company'
import ClientService from '@/services/client'
import VulnerabilityService from '@/services/vulnerability'
import UserService from '@/services/user'

import { $t } from '@/boot/i18n'

export default {
    data: () => {
        return {
            UserService: UserService,
            vulnerabilities: [],
            selectedTab: "vulnerabilities",
        }
    },

    mounted: function() {
        
    },

    methods: {
        getVulnerabilities: function() {
            this.vulnerabilities = [];
            VulnerabilityService.exportVulnerabilities()
            .then((data) => {
                this.vulnerabilities = data.data.datas;
                this.downloadVulnerabilities();
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        createVulnerabilities: function() {
            VulnerabilityService.createVulnerabilities(this.vulnerabilities)
            .then((data) => {
                var message = "";
                var color = "positive";
                if (data.data.datas.duplicates === 0) {
                    message = $t('importVulnerabilitiesOk',[data.data.datas.created]);
                }
                else if (data.data.datas.created === 0 && data.data.datas.duplicates > 0) {
                    message = $t('importVulnerabilitiesAllExists',[data.data.datas.duplicates.length]);
                    color = "negative";
                }
                else {
                    message = $t('importVulnerabilitiesPartial',[data.data.datas.created,data.data.datas.duplicates.length]);
                    color = "orange";
                }
                Notify.create({
                    message: message,
                    html: true,
                    closeBtn: 'x',
                    color: color,
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        importVulnerabilities: function(files) {
            this.vulnerabilities = [];
            var pending = 0;
            for (var i=0; i<files.length; i++) {
                ((file) => {
                    var fileReader = new FileReader();
                    fileReader.onloadend = (e) => {
                        var vulnFile;
                        var ext = file.name.split('.').pop();
                        if (ext === "yml") {
                            try {
                                vulnFile = YAML.safeLoad(fileReader.result);
                                if (typeof vulnFile === 'object') {
                                    if (Array.isArray(vulnFile)) {
                                        vulnFile.forEach(vuln => {
                                            if (Array.isArray(vuln.references) && vuln.references.length > 0) {
                                                vuln.details.forEach(d => {
                                                    if (!Array.isArray(d.references) || d.references.length == 0) {
                                                        d.references = vuln.references
                                                    }
                                                })
                                            }
                                        })
                                        this.vulnerabilities = vulnFile;
                                    }
                                    else
                                        this.vulnerabilities.push(vulnFile);
                                }
                                else
                                    throw new Error ($t('invalidYamlFormat'))
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.mark) errMsg = $t('err.parsingError2',[err.mark.line,err.mark.column]);                              
                                Notify.create({
                                    message: errMsg,
                                    color: 'negative',
                                    textColor: 'white',
                                    position: 'top-right'
                                })
                                return;
                            }
                        }
                        else if (ext === "json") {
                            try {
                                vulnFile = JSON.parse(fileReader.result);
                                if (typeof vulnFile === 'object') {
                                    if (Array.isArray(vulnFile)) {
                                        if (vulnFile.length > 0 && vulnFile[0].id)
                                            this.vulnerabilities = this.parseSerpico(vulnFile);
                                        else
                                            this.vulnerabilities = vulnFile;
                                    }
                                    else
                                        this.vulnerabilities.push(vulnFile);
                                }
                                else
                                    throw new Error ($t('err.invalidJsonFormat'))
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.message) errMsg = $t('err.parsingError1',[err.message]);
                                Notify.create({
                                    message: errMsg,
                                    color: 'negative',
                                    textColor: 'white',
                                    position: 'top-right'
                                })
                                return;
                            }
                        }
                        // file deepcode ignore DuplicateIfBody: <please specify a reason of ignoring this>
                        else if (ext === "nessus") {
                            try {
                                var parsedxml;
                                parsedxml= this.nessus2XML(fileReader.result)
                                vulnFile = JSON.parse(parsedxml);
                                if (typeof vulnFile === 'object') {
                                    if (Array.isArray(vulnFile)) {
                                        if (vulnFile.length > 0 && vulnFile[0].id)
                                            this.vulnerabilities = this.parseNessus(vulnFile);
                                        else
                                            this.vulnerabilities = vulnFile;
                                    }
                                    else
                                        this.vulnerabilities.push(vulnFile);
                                }
                                else
                                    throw new Error ($t('err.invalidJsonFormat'))
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.message) errMsg = $t('err.parsingError1',[err.message]);
                                Notify.create({
                                    message: errMsg,
                                    color: 'negative',
                                    textColor: 'white',
                                    position: 'top-right'
                                })
                                return;
                            }
                        }

                        else
                            console.log('Bad Extension')
                        pending--;
                        if (pending === 0) this.createVulnerabilities();
                    }
                    pending++;
                    fileReader.readAsText(file);
                })(files[i])
            }
        },
        nessus2XML: function(xmlData)
        {
            var jsonData;
            xml2js.parseString(xmlData, (err, result) => {
                if (err) {
                console.error('Error parsing Nessus XML:', err);
                process.exit(1); // Exit with an error code
                }
            
                // Access the parsed data
                const nessusReport = result.NessusClientData_v2.Report[0];
            
                // Create an object to hold the transformed data
                const transformedData = {};
            
                // Initialize an ID counter
                let idCounter = 1;
            
                nessusReport.ReportHost.forEach((host) => {
                const hostNameParts = host.$.name.split(' '); // Assuming the name contains the IP address
                const ipAddress = hostNameParts[0];
            
                host.ReportItem.forEach((item) => {
                    // Check if the properties exist before accessing them
                    const title = item.plugin_name[0];
                    const description = item.description ? item.description[0] : null;
                    const observation = item.synopsis ? item.synopsis[0] : null;
                    const remediation = item.solution ? item.solution[0] : null;
                    const references = item.see_also ? item.see_also[0] : null;
                    const cvssSeverity = item.risk_factor ? item.risk_factor[0] : null;
                    const cvssv3 = item.cvss3_vector ? item.cvss3_vector[0] : null;
                    const cvssScore = item.cvss3_base_score ? item.cvss3_base_score[0] : null;
            
                    // Create a unique key for each vulnerability combining title, remediation, references, cvssScore, and description
                    const vulnerabilityKey = `${title}_${remediation}_${references}_${cvssScore}_${cvssSeverity}_${description}`;
            
                    // Create an object for the vulnerability if it doesn't exist
                    if (!transformedData[vulnerabilityKey]) {
                    transformedData[vulnerabilityKey] = {
                        id: idCounter++,
                        title: title,
                        remediation: remediation,
                        references: references,
                        cvssScore: cvssScore,
                        cvssSeverity: cvssSeverity,
                        description: description,
                        cvssv3 : cvssv3,
                        observation: observation,
                        affected_hosts: [],
                    };
                    }
            
                    // Add the host IP address to the affected_hosts array if not already present
                    if (!transformedData[vulnerabilityKey].affected_hosts.includes(ipAddress)) {
                    transformedData[vulnerabilityKey].affected_hosts.push(ipAddress);
                    }
                });
                });
            
                // Convert the transformedData object to an array
                const transformedArray = Object.values(transformedData);
            
                // Write the transformed JSON data to the output file
                jsonData = JSON.stringify(transformedArray, null, 2);
                
            });
            return jsonData;
        },

        parseSerpico: function(vulnerabilities) {
            var result = [];
            vulnerabilities.forEach(vuln => {
                var tmpVuln = {};
                tmpVuln.cvssv3 = vuln.c3_vs || null;
                tmpVuln.priority = null;
                tmpVuln.remediationComplexity = null;
                var details = {};
                details.locale = this.formatSerpicoText(vuln.language) || 'en';
                details.title = this.formatSerpicoText(vuln.title);
                details.vulnType = this.formatSerpicoText(vuln.type);
                details.description = this.formatSerpicoText(vuln.overview);
                details.observation = this.formatSerpicoText(vuln.poc);
                details.remediation = this.formatSerpicoText(vuln.remediation);
                details.references = []
                if (vuln.references && vuln.references !== "") {
                    vuln.references = vuln.references.replace(/<paragraph>/g, '')
                    details.references = vuln.references.split('</paragraph>').filter(Boolean)
                }
                tmpVuln.details = [details];
                
                result.push(tmpVuln);
            });
            
            return result;
        },

        parseNessus: function(vulnerabilities) {
            var result = [];
            vulnerabilities.forEach(vuln => {
                var tmpVuln = {};
                tmpVuln.cvssv3 = vuln.cvssv3 || null;
                tmpVuln.priority = null;
                tmpVuln.remediationComplexity = null;
                tmpVuln.cvssScore = vuln.cvssScore || null;
                tmpVuln.cvssSeverity = vuln.cvssSeverity;
                var details = {};
                details.locale = this.formatSerpicoText(vuln.language) || 'en';
                details.title = this.formatSerpicoText(vuln.title);
                details.vulnType = this.formatSerpicoText(vuln.type) || 'Nessus';
                details.description = this.formatSerpicoText(vuln.description);
                details.observation = this.formatSerpicoText(vuln.observation);
                details.remediation = this.formatSerpicoText(vuln.remediation);
                details.references = []
                if (vuln.references && vuln.references !== "") {
                    vuln.references = vuln.references.replace(/<paragraph>/g, '')
                    details.references = vuln.references.split('</paragraph>').filter(Boolean)
                }
                tmpVuln.details = [details];
                
                result.push(tmpVuln);
            });
            
            return result;
        },

        formatSerpicoText: function(str) {
            if (!str) return null
            if (str === 'English') return 'en'
            if (str === 'French') return 'fr'

            var res = str
            // Headers (used as bold in Serpico)
            res = res.replace(/<h4>/g, '<b>')
            res = res.replace(/<\/h4>/g, '</b>')
            // First level bullets
            res = res.replace(/<paragraph><bullet>/g, '<li><p>')
            res = res.replace(/<\/bullet><\/paragraph>/g, '</p></li>')
            // Nested bullets (used as first level bullets)
            res = res.replace(/<paragraph><bullet1>/g, '<li><p>')
            res = res.replace(/<\/bullet1><\/paragraph>/g, '</p></li>')
            // Replace the paragraph tags and simply add linebreaks
            res = res.replace(/<paragraph>/g, '<p>')
            res = res.replace(/<\/paragraph>/g, '</p>')
            // Indented text
            res = res.replace(/<indented>/g, '    ')
            res = res.replace(/<\/indented>/g, '')
            // Italic
            res = res.replace(/<italics>/g, '<i>')
            res = res.replace(/<\/italics>/g, '</i>')
            // Code
            res = res.replace(/\[\[\[/g, '<pre><code>')
            res = res.replace(/]]]/g, '</code></pre>')
            // Apostroph
            res = this.$_.unescape(res)

            res = res.replace(/\n$/, '')

            return res
        },

        downloadVulnerabilities: function() {
            var data = YAML.safeDump(this.vulnerabilities);
            var blob = new Blob([data], {type: 'application/yaml'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = "vulnerabilities.yml";
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        },

        deleteAllVulnerabilities: function() {
            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: $t('msg.allVulnerabilitesDeleteNotice'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => {
                VulnerabilityService.deleteAllVulnerabilities()
                .then(() => {
                    Notify.create({
                        message: $t('msg.allVulnerabilitesDeleteOk'),
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                })
                .catch((err) => {
                    Notify.create({
                        message: err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
            })
        },
        // Companies
        
        getCompanies: function() {
            this.companies = [];
            CompanyService.exportCompanies()
            .then((data) => {
                this.companies = data.data.datas;
                this.downloadCompanies();
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },
        createCompanies: function() {
            CompanyService.createCompany(this.companies)
            .then((data) => {
                var message = "";
                var color = "positive";
                if (data.data.datas.duplicates === 0) {
                    message = $t('importCompaniesOk',[data.data.datas.created]);
                }
                else if (data.data.datas.created === 0 && data.data.datas.duplicates > 0) {
                    message = $t('importCompaniesAllExists',[data.data.datas.duplicates.length]);
                    color = "negative";
                }
                else {
                    message = $t('importCompaniesPartial',[data.data.datas.created,data.data.datas.duplicates.length]);
                    color = "orange";
                }
                Notify.create({
                    message: message,
                    html: true,
                    closeBtn: 'x',
                    color: color,
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },
        importCompanies: function(files) {
            this.companies = [];
            var pending = 0;
            for (var i=0; i<files.length; i++) {
                ((file) => {
                    var fileReader = new FileReader();
                    fileReader.onloadend = (e) => {
                        var compFile;
                        var ext = file.name.split('.').pop();
                        if (ext === "yml") {
                            try {
                                compFile = YAML.safeLoad(fileReader.result);
                                if (typeof compFile === 'object') {
                                    if (Array.isArray(compFile)) {
                                        this.companies = compFile;
                                    }
                                    else
                                        this.companies.push(compFile);
                                }
                                else
                                    throw new Error ($t('invalidYamlFormat'))
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.mark) errMsg = $t('err.parsingError2',[err.mark.line,err.mark.column]);                              
                                Notify.create({
                                    message: errMsg,
                                    color: 'negative',
                                    textColor: 'white',
                                    position: 'top-right'
                                })
                                return;
                            }
                        }
                        else
                            console.log('Bad Extension')
                        pending--;
                        if (pending === 0) this.createCompanies();
                    }
                    pending++;
                    fileReader.readAsText(file);
                })(files[i])
            }
        },
        downloadCompanies: function() {
            var data = YAML.safeDump(this.companies);
            var blob = new Blob([data], {type: 'application/yaml'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = "companies.yml";
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        },
        deleteAllCompanies: function() {
            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: $t('msg.allCompaniesDeleteNotice'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => {
                CompanyService.deleteAllCompanies()
                .then(() => {
                    Notify.create({
                        message: $t('msg.allCompaniesDeleteOk'),
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                })
                .catch((err) => {
                    Notify.create({
                        message: err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
            })
        },
        // Clients
        getClients: function() {
            this.clients = [];
            ClientService.exportClients()
            .then((data) => {
                this.clients = data.data.datas;
                this.downloadClients();
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },
        createClients: function() {
            ClientService.createClients(this.clients)
            .then((data) => {
                var message = "";
                var color = "positive";
                if (data.data.datas.duplicates === 0) {
                    message = $t('importClientsOk',[data.data.datas.created]);
                }
                else if (data.data.datas.created === 0 && data.data.datas.duplicates > 0) {
                    message = $t('importClientsAllExists',[data.data.datas.duplicates.length]);
                    color = "negative";
                }
                else {
                    message = $t('importClientsPartial',[data.data.datas.created,data.data.datas.duplicates.length]);
                    color = "orange";
                }
                Notify.create({
                    message: message,
                    html: true,
                    closeBtn: 'x',
                    color: color,
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })

        },
        importClients: function(files) {
            this.clients = [];
            var pending = 0;
            for (var i=0; i<files.length; i++) {
                ((file) => {
                    var fileReader = new FileReader();
                    fileReader.onloadend = (e) => {
                        var cltsFile;
                        var ext = file.name.split('.').pop();
                        if (ext === "yml") {
                            try {
                                cltsFile = YAML.safeLoad(fileReader.result);
                                if (typeof cltsFile === 'object') {
                                    if (Array.isArray(cltsFile)) {
                                        this.clients = cltsFile;
                                    }
                                    else
                                        this.clients.push(cltsFile);
                                }
                                else
                                    throw new Error ($t('invalidYamlFormat'))
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.mark) errMsg = $t('err.parsingError2',[err.mark.line,err.mark.column]);                              
                                Notify.create({
                                    message: errMsg,
                                    color: 'negative',
                                    textColor: 'white',
                                    position: 'top-right'
                                })
                                return;
                            }
                        }
                        else
                            console.log('Bad Extension')
                        pending--;
                        if (pending === 0) this.createClients();
                    }
                    pending++;
                    fileReader.readAsText(file);
                })(files[i])
            }
        },

        downloadClients: function() {
            var data = YAML.safeDump(this.clients);
            var blob = new Blob([data], {type: 'application/yaml'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = "clients.yml";
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        },
        deleteAllClients: function() {
            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: $t('msg.allClientsDeleteNotice'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => {
                ClientService.deleteAllClients()
                .then(() => {
                    Notify.create({
                        message: $t('msg.allClientsDeleteOk'),
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                })
                .catch((err) => {
                    Notify.create({
                        message: err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
            })
        },
        getCollaborators: function() {
            this.users = [];
            UserService.exportUsers()
            .then((data) => {
                this.users = data.data.datas;
                this.downloadUsers();
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },


        createCollab: function() {
            CollabService.createCollab(this.users)
            .then((data) => {
                var message = "";
                var color = "positive";
                if (data.data.datas.duplicates === 0) {
                    message = $t('importCollaboratorsOk',[data.data.datas.created]);
                }
                else if (data.data.datas.created === 0 && data.data.datas.duplicates > 0) {
                    message = $t('importCollaboratorsAllExists',[data.data.datas.duplicates.length]);
                    color = "negative";
                }
                else {
                    message = $t('importCollaboratorsPartial',[data.data.datas.created,data.data.datas.duplicates.length]);
                    color = "orange";
                }
                Notify.create({
                    message: message,
                    html: true,
                    closeBtn: 'x',
                    color: color,
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        importCollaborators: function(files) {
            this.users = [];
            var pending = 0;
            for (var i=0; i<files.length; i++) {
                ((file) => {
                    var fileReader = new FileReader();
                    fileReader.onloadend = (e) => {
                        var cltsFile;
                        var ext = file.name.split('.').pop();
                        if (ext === "yml") {
                            try {
                                cltsFile = YAML.safeLoad(fileReader.result);
                                if (typeof cltsFile === 'object') {
                                    if (Array.isArray(cltsFile)) {
                                        this.users = cltsFile;
                                    }
                                    else
                                        this.users.push(cltsFile);
                                }
                                else
                                    throw new Error ($t('invalidYamlFormat'))
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.mark) errMsg = $t('err.parsingError2',[err.mark.line,err.mark.column]);                              
                                Notify.create({
                                    message: errMsg,
                                    color: 'negative',
                                    textColor: 'white',
                                    position: 'top-right'
                                })
                                return;
                            }
                        }
                        else
                            console.log('Bad Extension')
                        pending--;
                        if (pending === 0) this.createCollab();
                    }
                    pending++;
                    fileReader.readAsText(file);
                })(files[i])
            }
        },

        downloadUsers: function() {
            var data = YAML.safeDump(this.users);
            var blob = new Blob([data], {type: 'application/yaml'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = "users.yml";
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        },

        deleteAllUsers: function() {
            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: $t('msg.allCollabDeleteNotice'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => {
                CollabService.deleteAllCollab()
                .then(() => {
                    Notify.create({
                        message: $t('msg.allCollabDeleteOk'),
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                })
                .catch((err) => {
                    Notify.create({
                        message: err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
            })
        }

    }
}