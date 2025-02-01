exports.ApiResponse = (data, message, success,statusCode) => {
    return {
        success,
        message,
        data: data || null,
        statusCode
    };
};
