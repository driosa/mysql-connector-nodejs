"use strict";

var chai = require("chai"),
    spies = require('chai-spies');
chai.should();
chai.use(spies);

var assert = require("assert");
var Client = require("../../lib/Protocol/Client");
var Server = require("../../lib/Protocol/Server");
var Encoding = require("../../lib/Protocol/Encoding");
var Datatype = require("../../lib/Protocol/Datatype");
var Messages = require('../../lib/Protocol/Messages'),
    protobuf = new (require('../../lib/Protocol/protobuf.js'))(Messages);

var nullStream = {
    on: function () {},
    write: function () {}
};

function produceResultSet(protocol, columnCount, rowCount, warnings) {
    const result = new Server.ResultSet(data => protocol.handleServerMessage(data));
    result.beginResult(columnCount);
    for (let r = 0; r < rowCount; ++r) {
        result.row(columnCount);
    }
    result.finalizeSingle();
    if (warnings && warnings.length) {
        warnings.forEach(function (warning)  {
            result.warning(warning);
        });
    }
    result.finalize();
}

describe('Client', function () {
    describe('sqlStatementExecute', function () {
        it('should throw if row callback is no function', function () {
            const protocol = new Client(nullStream);
            (() => {
                protocol.sqlStmtExecute("invalid SQL", [], "this is not a function");
            }).should.throw(/.*has to be a function.*/);
        });
        it('should throw if meta callback is no function', function () {
            const protocol = new Client(nullStream);
            (() => {
                protocol.sqlStmtExecute("invalid SQL", [], ()=>{}, "this is not a function");
            }).should.throw(/.*has to be a function.*/);
        });
        it('should reject the promise on error', function () {
            const protocol = new Client(nullStream),
                  promise = protocol.sqlStmtExecute("invalid SQL", []);

            protocol.handleServerMessage(Encoding.encodeMessage(Messages.ServerMessages.ERROR, {
                code: 1064,
                sql_state: "42000",
                msg: 'You have an error in your SQL syntax'
            }, Encoding.serverMessages));
            return promise.should.be.rejected;
        });
        it('should reject the promise on invalid message', function () {
            const protocol = new Client(nullStream),
                promise = protocol.sqlStmtExecute("SELECT 1", []);

            protocol.handleServerMessage(Encoding.encodeMessage(Messages.ServerMessages.SESS_AUTHENTICATE_OK, {}, Encoding.serverMessages));
            return promise.should.be.rejected;
        });
        it('should reject the promise on invalid message', function () {
            const protocol = new Client(nullStream),
                promise = protocol.sqlStmtExecute("SELECT 1", []);

            protocol.handleServerMessage(Encoding.encodeMessage(Messages.ServerMessages.SESS_AUTHENTICATE_OK, {}, Encoding.serverMessages));
            return promise.should.be.rejected;
        });
        it('should reject the promise on invalid message and allow further requests', function () {
            const protocol = new Client(nullStream),
                promise1 = protocol.sqlStmtExecute("SELECT 1", []),
                promise2 = protocol.sqlStmtExecute("SELECT 1", []);

            protocol.handleServerMessage(Encoding.encodeMessage(Messages.ServerMessages.SESS_AUTHENTICATE_OK, {}, Encoding.serverMessages));
            produceResultSet(protocol, 1, 1);
            return Promise.all([
                promise1.should.be.rejected,
                promise2.should.be.fullfilled
            ]);
        });
        it('should reject the promise on hard stream close', function () {
            let closeStream = {
                closefunc: undefined,
                on: function (what, cb) {
                    if (what === 'close') {
                        this.closefunc = cb;
                    }
                },
                write: function () {}
            };
            const protocol = new Client(closeStream),
                promise = protocol.sqlStmtExecute("SELECT 1", []);

            closeStream.closefunc();
            return promise.should.be.rejected;
        });
        it('should report on meta data', function () {
            const protocol = new Client(nullStream),
                  metacb = chai.spy(),
                  promise = protocol.sqlStmtExecute("SELECT * FROM t", [], () => {}, metacb);

            produceResultSet(protocol, 1, 1);
            metacb.should.have.been.called.once;
            return promise.should.be.fulfilled;
        });
        it('should handle warning', function () {
            const protocol = new Client(nullStream),
                promise = protocol.sqlStmtExecute("SELECT CAST('a' AS UNSIGNED)", []),
                warning = {
                    level: 2,
                    code: 1292,
                    msg: 'Truncated incorrect INTEGER value: \'a\''
                };

            produceResultSet(protocol, 1, 1, [warning]);
            return promise.should.eventually.deep.equal({warnings: [ warning ]});
        });
        for (let count = 0; count < 3; ++count) {
            it('should call row callback for each row data ('+count+' rows)', function () {
                const protocol = new Client(nullStream),
                      rowcb = chai.spy(),
                      promise = protocol.sqlStmtExecute("SELECT * FROM t", [], rowcb);

                produceResultSet(protocol, 1, count);
                rowcb.should.have.been.called.exactly(count);
                return promise.should.be.fulfilled;
            });
        }
        it('should accept arguments', function () {
            const protocol = new Client(nullStream),
                promise = protocol.sqlStmtExecute("SELECT * FROM t", ["a", 23]);

            produceResultSet(protocol, 1, 1);
            return promise.should.be.fulfilled;
        });

        // for those we hae to inspect the sent message:
        it('should verify bound parameters');
        it('should handle queries wihout result set');
        it('should handle multiple result sets');
        it('should verify default namespace (sql)');
        it('should allow custom namespace');
    });
});
