import csvParser from "csv-parser";
import XLSX from "xlsx";

// SIMPLE CSV PARSER
export const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = require("stream");
    const readStream = new stream.PassThrough();
    readStream.end(buffer);

    readStream
      .pipe(csvParser())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
};

// SIMPLE XLS PARSER
export const parseXLS = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
};

export const formatJoiError = (error) => {
  return error.details[0].message.replace(/"/g, ""); // remove all quotes
};

/**
 * Reusable helper for search + pagination.
 *
 * @param {Object} pool - MySQL pool
 * @param {Object} opts
 *  - table: table name
 *  - search: keyword (optional)
 *  - searchColumn: column name to search
 *  - page: page number (optional)
 *  - limit: limit per page (optional)
 *  - orderBy: sort column (default: "id")
 */
export const fetchWithSearchAndPagination = async (
  pool,
  { table, search, searchColumn, page, limit, orderBy = "id" }
) => {
  const hasSearch = typeof search === "string" && search.trim().length >= 3;
  const hasPagination = page != null && limit != null;

  // Base where clause
  let whereClause = "";
  const params = [];

  if (hasSearch) {
    whereClause = ` WHERE ${searchColumn} LIKE ?`;
    params.push(`%${search.trim()}%`);
  }

  if (hasPagination) {
    // count total
    const countSql = `SELECT COUNT(*) as cnt FROM ${table}${whereClause}`;
    const [countRows] = await pool.execute(countSql, params);
    const total = countRows[0].cnt;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const dataSql = `
    SELECT * FROM ${table}
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
    const dataParams = params.concat([limitNum, offset]); // numbers, not strings
    const [rows] = await pool.query(dataSql, dataParams);

    return {
      total_records: total,
      page: parseInt(page),
      limit: parseInt(limit),
      records: rows,
    };
  } else if (hasSearch) {
    // only search, no pagination
    const dataSql = `
      SELECT * FROM ${table}
      ${whereClause}
      ORDER BY ${orderBy}
    `;
    const [rows] = await pool.execute(dataSql, params);
    return rows;
  } else {
    // no pagination or search — return all
    const [rows] = await pool.execute(
      `SELECT * FROM ${table} ORDER BY ${orderBy}`
    );
    return rows;
  }
};
