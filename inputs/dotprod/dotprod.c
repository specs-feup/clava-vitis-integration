#include <stdio.h>

#define N 1024

/*
Possible recipe:
#pragma HLS ARRAY_PARTITION variable = a complete
#pragma HLS ARRAY_PARTITION variable = b complete

#pragma HLS UNROLL factor = 4
#pragma HLS PIPELINE II = 1
*/

int dotprod(int a[N], int b[N])
{

    int sum = 0;
    for (int i = 0; i < N; i++)
    {
        sum += a[i] * b[i];
    }
    return sum;
}

int main()
{
    int a[N], b[N], expected = 0;

    for (int i = 0; i < N; i++)
    {
        a[i] = i % 16;
        b[i] = (i % 7) - 3;
        expected += a[i] * b[i];
    }

    int result = dotprod(a, b);

    printf("result=%d expected=%d\n", result, expected);
    return result != expected; // 0 = pass
}