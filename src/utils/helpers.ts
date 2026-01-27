import csvParser from "csv-parser";
import XLSX from "xlsx";
import type {
  ParsedFile,
  ParsedFileRow,
  JoiError,
  FetchOptions,
  FetchResult,
  MySQLPool,
} from "../types/index.ts";
import type { RowDataPacket } from "mysql2/promise";

// SIMPLE CSV PARSER
export const parseCSV = (buffer: Buffer): Promise<ParsedFile> => {
  return new Promise((resolve, reject) => {
    const results: ParsedFile = [];
    const stream = require("stream");
    const readStream = new stream.PassThrough();
    readStream.end(buffer);

    readStream
      .pipe(csvParser())
      .on("data", (row: ParsedFileRow) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
};

// SIMPLE XLS PARSER
export const parseXLS = (buffer: Buffer): ParsedFile => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet) as ParsedFile;
};

// Format Joi error
export const formatJoiError = (error: JoiError): string => {
  return error.details[0].message.replace(/"/g, ""); // remove all quotes
};

/**
 * Reusable helper for search + pagination
 */
export const fetchWithSearchAndPagination = async <
  T extends RowDataPacket = RowDataPacket,
>(
  pool: MySQLPool,
  { table, search, searchColumn, page, limit, orderBy = "id" }: FetchOptions,
): Promise<FetchResult<T> | T[]> => {
  const hasSearch = typeof search === "string" && search.trim().length >= 3;
  const hasPagination = page != null && limit != null;

  let whereClause = "";
  const params: any[] = [];

  if (hasSearch && searchColumn) {
    whereClause = ` WHERE ${searchColumn} LIKE ?`;
    params.push(`%${search.trim()}%`);
  }

  if (hasPagination) {
    // Count total records
    const countSql = `SELECT COUNT(*) as cnt FROM ${table}${whereClause}`;
    const [countRows] = await pool.execute<RowDataPacket[]>(countSql, params);
    const total = countRows[0].cnt;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const dataSql = `
      SELECT * FROM ${table}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const dataParams = params.concat([limitNum, offset]);
    const [rows] = await pool.query<T[]>(dataSql, dataParams);

    return {
      total_records: total,
      page: pageNum,
      limit: limitNum,
      records: rows,
    };
  } else if (hasSearch) {
    const dataSql = `
      SELECT * FROM ${table}
      ${whereClause}
      ORDER BY ${orderBy}
    `;
    const [rows] = await pool.execute<T[]>(dataSql, params);
    return rows;
  } else {
    const [rows] = await pool.execute<T[]>(
      `SELECT * FROM ${table} ORDER BY ${orderBy}`,
    );
    return rows;
  }
};
