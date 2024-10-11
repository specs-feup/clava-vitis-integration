

void loop_characterization(int A[100], int B[200], int C[300])
{
    for (int i = 0; i < 100; i++)
    {
        for (int j = 0; j < 200; j++)
        {
            for (int k = 0; k < 300; k++)
            {
                C[k] = A[i] + B[j];
            }
        }
    }
}