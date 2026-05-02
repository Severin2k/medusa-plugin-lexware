import { Module } from "@medusajs/framework/utils"
import LexwareModuleService from "./service.js"

export const LEXWARE_MODULE = "lexware"

export default Module(LEXWARE_MODULE, {
  service: LexwareModuleService,
})
