import Vue from 'vue'

export default {
  getCompanies: function() {
    return Vue.prototype.$axios.get(`companies`)
  },

  exportCompanies: function() {
    return Vue.prototype.$axios.get(`companies/export`)
  },

  createCompany: function(company) {
    return Vue.prototype.$axios.post('companies', company)
  },

  updateCompany: function(companyId, company) {
    return Vue.prototype.$axios.put(`companies/${companyId}`, company)
  },

  deleteCompany: function(companyId) {
    return Vue.prototype.$axios.delete(`companies/${companyId}`)
  },

  deleteAllCompanies: function() {
    return Vue.prototype.$axios.delete(`companies`)
  }
}