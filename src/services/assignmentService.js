import * as Assignment from "../models/assignmentModel.js";

export const createAssignment = async (data) => await Assignment.create(data);
export const getAllAssignments = async () => await Assignment.findAll();
export const getAssignmentById = async (id) => await Assignment.findById(id);
export const updateAssignment = async (id, data) =>
  await Assignment.update(id, data);
export const deleteAssignment = async (id) => await Assignment.remove(id);
